/**
 * Image Moderation Manager
 * Handles moderation status, admin queue, and auto-flagging
 */

class ImageModerationManager {
    constructor(db) {
        this.db = db;
        this.moderationStatus = {
            PENDING: 'pending',
            APPROVED: 'approved',
            REJECTED: 'rejected',
            FLAGGED: 'flagged'
        };
    }

    /**
     * Submit image for moderation
     */
    async submitForModeration(reportId, imageUrl, userId) {
        const moderationRecord = {
            report_id: reportId,
            image_url: imageUrl,
            submitted_by: userId,
            status: this.moderationStatus.PENDING,
            submitted_at: new Date().toISOString(),
            moderated_at: null,
            moderated_by: null,
            rejection_reason: null,
            auto_flagged: false,
            confidence_score: null
        };

        try {
            // Try auto-moderation first
            const autoResult = await this.autoModerate(imageUrl);
            
            if (autoResult.isSafe === false) {
                moderationRecord.auto_flagged = true;
                moderationRecord.status = this.moderationStatus.FLAGGED;
                moderationRecord.confidence_score = autoResult.confidence;
                moderationRecord.rejection_reason = autoResult.reason;
            }

            // Store moderation record
            return await this.db.insert('image_moderation', moderationRecord);
        } catch (error) {
            console.error('Moderation submission failed:', error);
            // Still create the record even if auto-moderation fails
            return await this.db.insert('image_moderation', moderationRecord);
        }
    }

    /**
     * Auto-moderate image using AI
     */
    async autoModerate(imageUrl) {
        try {
            // Convert image URL to base64 if needed
            const base64 = await this.urlToBase64(imageUrl);
            
            // Use the proxy endpoint for moderation
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'moderate',
                    imageData: base64,
                    contents: [{
                        parts: [{
                            text: `Analyze this image for content moderation. Check if it contains:
                            - Inappropriate or adult content
                            - Violence or graphic content
                            - Hate symbols or offensive material
                            - Spam or irrelevant content
                            
                            Respond with JSON: { "isSafe": true/false, "confidence": 0-100, "reason": "explanation if not safe" }`
                        }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                try {
                    // Parse JSON from response
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch (e) {
                    console.warn('Failed to parse moderation response:', e);
                }
            }
            
            // Default to requiring manual review
            return { isSafe: true, confidence: 50, needsReview: true };
        } catch (error) {
            console.error('Auto-moderation failed:', error);
            return { isSafe: true, confidence: 0, needsReview: true };
        }
    }

    /**
     * Convert image URL to base64
     */
    async urlToBase64(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Failed to convert URL to base64:', error);
            throw error;
        }
    }

    /**
     * Get pending moderation queue for admin
     */
    async getModerationQueue(status = null, limit = 50) {
        try {
            let query = this.db.supabase
                .from('image_moderation')
                .select(`
                    *,
                    reports (id, title, category)
                `)
                .order('submitted_at', { ascending: false })
                .limit(limit);

            if (status) {
                query = query.eq('status', status);
            } else {
                // Default to pending and flagged
                query = query.in('status', [this.moderationStatus.PENDING, this.moderationStatus.FLAGGED]);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to get moderation queue:', error);
            return [];
        }
    }

    /**
     * Approve image
     */
    async approveImage(moderationId, moderatorId) {
        return this.updateModerationStatus(
            moderationId,
            this.moderationStatus.APPROVED,
            moderatorId
        );
    }

    /**
     * Reject image
     */
    async rejectImage(moderationId, moderatorId, reason) {
        return this.updateModerationStatus(
            moderationId,
            this.moderationStatus.REJECTED,
            moderatorId,
            reason
        );
    }

    /**
     * Update moderation status
     */
    async updateModerationStatus(moderationId, status, moderatorId, reason = null) {
        try {
            const { data, error } = await this.db.supabase
                .from('image_moderation')
                .update({
                    status: status,
                    moderated_by: moderatorId,
                    moderated_at: new Date().toISOString(),
                    rejection_reason: reason
                })
                .eq('id', moderationId)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Failed to update moderation status:', error);
            throw error;
        }
    }

    /**
     * Get moderation stats
     */
    async getModerationStats() {
        try {
            const { data, error } = await this.db.supabase
                .from('image_moderation')
                .select('status');

            if (error) throw error;

            const stats = {
                total: data.length,
                pending: 0,
                approved: 0,
                rejected: 0,
                flagged: 0
            };

            data.forEach(item => {
                if (stats[item.status] !== undefined) {
                    stats[item.status]++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Failed to get moderation stats:', error);
            return { total: 0, pending: 0, approved: 0, rejected: 0, flagged: 0 };
        }
    }

    /**
     * Render moderation queue UI
     */
    renderModerationQueue(container, queue) {
        if (!queue || queue.length === 0) {
            container.innerHTML = '<p class="text-muted">No images pending moderation</p>';
            return;
        }

        container.innerHTML = queue.map(item => `
            <div class="moderation-item ${item.auto_flagged ? 'moderation-item--flagged' : ''}" data-id="${item.id}">
                <div class="moderation-item__image">
                    <img src="${item.image_url}" alt="Report image" loading="lazy">
                    ${item.auto_flagged ? '<span class="moderation-badge moderation-badge--flagged">⚠️ Auto-Flagged</span>' : ''}
                </div>
                <div class="moderation-item__info">
                    <h4>Report #${item.report_id}</h4>
                    <p>${item.reports?.title || 'Unknown report'}</p>
                    <p class="text-muted">Submitted: ${new Date(item.submitted_at).toLocaleString()}</p>
                    ${item.rejection_reason ? `<p class="text-danger">Reason: ${item.rejection_reason}</p>` : ''}
                    ${item.confidence_score ? `<p>Confidence: ${item.confidence_score}%</p>` : ''}
                </div>
                <div class="moderation-item__actions">
                    <button class="btn btn--success btn--sm" onclick="imageModerationManager.handleApprove(${item.id})">
                        ✓ Approve
                    </button>
                    <button class="btn btn--danger btn--sm" onclick="imageModerationManager.handleReject(${item.id})">
                        ✗ Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Handle approve action
     */
    async handleApprove(moderationId) {
        try {
            const moderatorId = window.app?.currentUser?.id;
            await this.approveImage(moderationId, moderatorId);
            window.app?.showToast('Image approved', 'success');
            // Refresh queue
            this.refreshQueue();
        } catch (error) {
            window.app?.showToast('Failed to approve image', 'error');
        }
    }

    /**
     * Handle reject action
     */
    async handleReject(moderationId) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            const moderatorId = window.app?.currentUser?.id;
            await this.rejectImage(moderationId, moderatorId, reason);
            window.app?.showToast('Image rejected', 'success');
            // Refresh queue
            this.refreshQueue();
        } catch (error) {
            window.app?.showToast('Failed to reject image', 'error');
        }
    }

    /**
     * Refresh moderation queue
     */
    async refreshQueue() {
        const container = document.getElementById('moderationQueue');
        if (container) {
            const queue = await this.getModerationQueue();
            this.renderModerationQueue(container, queue);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageModerationManager;
} else {
    window.ImageModerationManager = ImageModerationManager;
}
