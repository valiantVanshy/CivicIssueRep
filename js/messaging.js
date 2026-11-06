/**
 * In-App Messaging & Staff Assignment System
 * Handles messaging between citizens, staff, and admin with SLA tracking
 */

class MessagingManager {
    constructor() {
        this.currentConversation = null;
        this.slaConfig = {
            urgent: { hours: 4, label: 'Urgent (4 hours)' },
            high: { hours: 24, label: 'High (1 day)' },
            medium: { hours: 72, label: 'Medium (3 days)' },
            low: { hours: 168, label: 'Low (7 days)' }
        };
        this.init();
    }
    
    /**
     * Get supabase client from app
     */
    get supabase() {
        return window.app?.db?.supabase || null;
    }

    /**
     * Initialize messaging system
     */
    async init() {
        console.log('[Messaging] Initializing...');
        this.setupRealtimeSubscription();
        this.createMessagingUI();
        console.log('[Messaging] Initialization complete');
    }

    /**
     * Create messaging UI components
     */
    createMessagingUI() {
        // Create messaging panel
        const messagingPanel = document.createElement('div');
        messagingPanel.id = 'messagingPanel';
        messagingPanel.className = 'messaging-panel hidden';
        messagingPanel.setAttribute('role', 'dialog');
        messagingPanel.setAttribute('aria-label', 'Messaging panel');
        messagingPanel.innerHTML = `
            <div class="messaging-header">
                <h3 id="messagingTitle">Messages</h3>
                <div class="messaging-actions">
                    <button class="btn btn-icon" id="refreshMessages" aria-label="Refresh messages">🔄</button>
                    <button class="btn btn-icon" id="closeMessaging" aria-label="Close messages">&times;</button>
                </div>
            </div>
            <div class="messaging-tabs" role="tablist">
                <button class="tab-btn active" data-tab="inbox" role="tab" aria-selected="true">📥 Inbox</button>
                <button class="tab-btn" data-tab="sent" role="tab" aria-selected="false">📤 Sent</button>
                <button class="tab-btn" data-tab="assignments" role="tab" aria-selected="false">👥 Assignments</button>
            </div>
            <div class="messaging-content">
                <div class="message-list" id="messageList" role="listbox" aria-label="Message list"></div>
            </div>
            <div class="messaging-compose hidden" id="composeSection">
                <div class="compose-header">
                    <h4>New Message</h4>
                    <button class="btn btn-icon" id="cancelCompose" aria-label="Cancel">&times;</button>
                </div>
                <form id="composeForm">
                    <div class="form-group">
                        <label for="messageTo">To:</label>
                        <select id="messageTo" required aria-label="Select recipient">
                            <option value="">Select recipient...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="messageSubject">Subject:</label>
                        <input type="text" id="messageSubject" required aria-label="Message subject" placeholder="Enter subject...">
                    </div>
                    <div class="form-group">
                        <label for="relatedReport">Related Report (optional):</label>
                        <select id="relatedReport" aria-label="Link to report">
                            <option value="">None</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="messageBody">Message:</label>
                        <textarea id="messageBody" rows="4" required aria-label="Message content" placeholder="Type your message..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">📤 Send</button>
                    </div>
                </form>
            </div>
        </div>`;

        document.body.appendChild(messagingPanel);

        // Create floating message button
        const messageBtn = document.createElement('button');
        messageBtn.id = 'messagingBtn';
        messageBtn.className = 'floating-message-btn';
        messageBtn.setAttribute('aria-label', 'Open messages');
        messageBtn.innerHTML = `💬 <span class="badge hidden" id="unreadBadge">0</span>`;
        document.body.appendChild(messageBtn);

        // Create assignment modal
        const assignModal = document.createElement('div');
        assignModal.id = 'assignmentModal';
        assignModal.className = 'modal hidden';
        assignModal.setAttribute('role', 'dialog');
        assignModal.setAttribute('aria-labelledby', 'assignModalTitle');
        assignModal.innerHTML = `
            <div class="modal-content assignment-modal">
                <div class="modal-header">
                    <h3 id="assignModalTitle">Assign Report to Staff</h3>
                    <button class="btn btn-icon close-modal" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="assignToStaff">Assign to Staff Member:</label>
                        <select id="assignToStaff" required aria-label="Select staff member">
                            <option value="">Select staff...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="assignPriority">Priority / SLA:</label>
                        <select id="assignPriority" required aria-label="Select priority">
                            <option value="medium">Medium (3 days)</option>
                            <option value="low">Low (7 days)</option>
                            <option value="high">High (1 day)</option>
                            <option value="urgent">Urgent (4 hours)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="assignNotes">Notes:</label>
                        <textarea id="assignNotes" rows="3" placeholder="Add notes for the assigned staff..." aria-label="Assignment notes"></textarea>
                    </div>
                    <div class="sla-preview" id="slaPreview">
                        <strong>SLA Deadline:</strong> <span id="slaDeadline">--</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal">Cancel</button>
                    <button class="btn btn-primary" id="confirmAssignment">Assign</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(assignModal);

        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Open messaging panel
        document.getElementById('messagingBtn')?.addEventListener('click', () => this.togglePanel());
        
        // Close panel
        document.getElementById('closeMessaging')?.addEventListener('click', () => this.closePanel());
        
        // Refresh messages
        document.getElementById('refreshMessages')?.addEventListener('click', () => this.loadMessages());
        
        // Tab switching
        document.querySelectorAll('.messaging-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Compose form
        document.getElementById('composeForm')?.addEventListener('submit', (e) => this.handleSend(e));
        document.getElementById('cancelCompose')?.addEventListener('click', () => this.hideCompose());

        // Assignment modal
        document.getElementById('assignPriority')?.addEventListener('change', () => this.updateSLAPreview());
        document.getElementById('confirmAssignment')?.addEventListener('click', () => this.handleAssignment());
        
        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Keyboard accessibility
        document.getElementById('messagingPanel')?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePanel();
        });
    }

    /**
     * Setup realtime subscription for new messages
     */
    setupRealtimeSubscription() {
        if (!this.supabase) {
            console.log('Supabase not ready for messaging realtime');
            return;
        }

        try {
            this.supabase
                .channel('messages-realtime')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                }, payload => {
                    this.handleNewMessage(payload.new);
                })
                .subscribe();
        } catch (error) {
            console.log('Messaging realtime setup deferred:', error.message);
        }
    }

    /**
     * Handle new message notification
     */
    handleNewMessage(message) {
        const currentUser = window.app?.auth?.currentUser;
        if (message.to_user_id === currentUser?.id) {
            this.showNotification('New Message', message.subject || 'You have a new message');
            this.updateUnreadBadge();
        }
    }

    /**
     * Toggle messaging panel
     */
    togglePanel() {
        const panel = document.getElementById('messagingPanel');
        if (panel.classList.contains('hidden')) {
            this.openPanel();
        } else {
            this.closePanel();
        }
    }

    /**
     * Open messaging panel
     */
    async openPanel() {
        const panel = document.getElementById('messagingPanel');
        panel.classList.remove('hidden');
        panel.querySelector('#closeMessaging')?.focus();
        await this.loadMessages();
    }

    /**
     * Close messaging panel
     */
    closePanel() {
        const panel = document.getElementById('messagingPanel');
        panel.classList.add('hidden');
        document.getElementById('messagingBtn')?.focus();
    }

    /**
     * Switch between tabs
     */
    async switchTab(tab) {
        document.querySelectorAll('.messaging-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
            btn.setAttribute('aria-selected', btn.dataset.tab === tab);
        });

        switch(tab) {
            case 'inbox':
                await this.loadMessages('inbox');
                break;
            case 'sent':
                await this.loadMessages('sent');
                break;
            case 'assignments':
                await this.loadAssignments();
                break;
        }
    }

    /**
     * Load messages from Supabase
     */
    async loadMessages(type = 'inbox') {
        const messageList = document.getElementById('messageList');
        if (!messageList) return;

        const currentUser = window.app?.auth?.currentUser;
        if (!currentUser) {
            messageList.innerHTML = '<div class="empty-state">Please log in to view messages</div>';
            return;
        }

        messageList.innerHTML = '<div class="loading-messages">Loading messages...</div>';

        try {
            let query;
            if (type === 'inbox') {
                query = this.supabase
                    .from('messages')
                    .select('*')
                    .eq('to_user_id', currentUser.id)
                    .order('created_at', { ascending: false });
            } else {
                query = this.supabase
                    .from('messages')
                    .select('*')
                    .eq('from_user_id', currentUser.id)
                    .order('created_at', { ascending: false });
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;

            this.renderMessages(data || [], type);
        } catch (error) {
            console.error('Error loading messages:', error);
            messageList.innerHTML = `
                <div class="empty-state">
                    <p>Unable to load messages</p>
                    <button class="btn btn-primary compose-btn" onclick="messagingManager.showCompose()">
                        ✏️ Compose New Message
                    </button>
                </div>`;
        }
    }

    /**
     * Render message list
     */
    renderMessages(messages, type) {
        const messageList = document.getElementById('messageList');
        
        if (messages.length === 0) {
            messageList.innerHTML = `
                <div class="empty-state">
                    <p>No messages yet</p>
                    <button class="btn btn-primary compose-btn" onclick="messagingManager.showCompose()">
                        ✏️ Compose New Message
                    </button>
                </div>`;
            return;
        }

        messageList.innerHTML = messages.map(msg => `
            <div class="message-item ${msg.read ? '' : 'unread'}" 
                 data-id="${msg.id}" 
                 role="option"
                 tabindex="0"
                 aria-label="${msg.subject || 'No subject'} - ${msg.read ? 'Read' : 'Unread'}">
                <div class="message-header">
                    <span class="message-from">${type === 'inbox' ? '📨 From: ' + (msg.from_name || 'Unknown') : '📤 To: ' + (msg.to_name || 'Unknown')}</span>
                    <span class="message-date">${this.formatDate(msg.created_at)}</span>
                </div>
                <div class="message-subject">${msg.subject || 'No subject'}</div>
                <div class="message-preview">${(msg.body || '').substring(0, 100)}${msg.body?.length > 100 ? '...' : ''}</div>
                ${msg.report_id ? '<span class="report-link">📋 Linked to report</span>' : ''}
            </div>
        `).join('');

        // Add click handlers
        messageList.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', () => this.openMessage(item.dataset.id));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openMessage(item.dataset.id);
                }
            });
        });

        // Add compose button at bottom
        const composeBtn = document.createElement('button');
        composeBtn.className = 'btn btn-primary compose-floating-btn';
        composeBtn.innerHTML = '✏️ New Message';
        composeBtn.onclick = () => this.showCompose();
        messageList.appendChild(composeBtn);
    }

    /**
     * Load staff assignments
     */
    async loadAssignments() {
        const messageList = document.getElementById('messageList');
        if (!messageList) return;

        const currentUser = window.app?.auth?.currentUser;
        const userRole = window.app?.currentUserRole;
        
        if (!currentUser || !['admin', 'staff'].includes(userRole)) {
            messageList.innerHTML = '<div class="empty-state">Assignments are only visible to staff and admin</div>';
            return;
        }

        messageList.innerHTML = '<div class="loading-messages">Loading assignments...</div>';

        try {
            let query = this.supabase
                .from('report_assignments')
                .select(`
                    *,
                    reports (id, category, subcategory, description, status, created_at)
                `)
                .order('created_at', { ascending: false });

            if (userRole === 'staff') {
                query = query.eq('assigned_to', currentUser.id);
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;

            this.renderAssignments(data || []);
        } catch (error) {
            console.error('Error loading assignments:', error);
            messageList.innerHTML = '<div class="empty-state">Unable to load assignments</div>';
        }
    }

    /**
     * Render assignments list
     */
    renderAssignments(assignments) {
        const messageList = document.getElementById('messageList');
        
        if (assignments.length === 0) {
            messageList.innerHTML = '<div class="empty-state">No assignments yet</div>';
            return;
        }

        messageList.innerHTML = assignments.map(a => {
            const slaStatus = this.calculateSLAStatus(a);
            return `
                <div class="assignment-item ${slaStatus.class}" 
                     data-id="${a.id}"
                     role="option"
                     tabindex="0">
                    <div class="assignment-header">
                        <span class="assignment-priority priority-${a.priority}">${a.priority?.toUpperCase()}</span>
                        <span class="sla-badge ${slaStatus.class}">${slaStatus.label}</span>
                    </div>
                    <div class="assignment-report">
                        📋 ${a.reports?.category || 'Unknown'} - ${a.reports?.subcategory || ''}
                    </div>
                    <div class="assignment-details">
                        <span>Assigned: ${this.formatDate(a.created_at)}</span>
                        <span>Due: ${this.formatDate(a.sla_deadline)}</span>
                    </div>
                    ${a.notes ? `<div class="assignment-notes">${a.notes}</div>` : ''}
                    <div class="assignment-actions">
                        <button class="btn btn-small btn-primary" onclick="messagingManager.viewReport('${a.report_id}')">View Report</button>
                        <button class="btn btn-small btn-success" onclick="messagingManager.markComplete('${a.id}')">Mark Complete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Calculate SLA status
     */
    calculateSLAStatus(assignment) {
        if (!assignment.sla_deadline) {
            return { class: 'sla-unknown', label: 'No SLA' };
        }

        const now = new Date();
        const deadline = new Date(assignment.sla_deadline);
        const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

        if (assignment.completed_at) {
            const completedAt = new Date(assignment.completed_at);
            return completedAt <= deadline 
                ? { class: 'sla-met', label: '✅ SLA Met' }
                : { class: 'sla-breached', label: '⚠️ SLA Breached' };
        }

        if (hoursRemaining < 0) {
            return { class: 'sla-breached', label: '🔴 Overdue' };
        } else if (hoursRemaining < 4) {
            return { class: 'sla-critical', label: '🟠 Critical' };
        } else if (hoursRemaining < 24) {
            return { class: 'sla-warning', label: '🟡 Soon' };
        }
        return { class: 'sla-ok', label: '🟢 On Track' };
    }

    /**
     * Show compose form
     */
    async showCompose(recipientId = null, reportId = null) {
        const composeSection = document.getElementById('composeSection');
        composeSection.classList.remove('hidden');
        
        // Load recipients (staff and admin users)
        await this.loadRecipients();
        
        // Load reports for linking
        await this.loadReportsForLinking();

        if (recipientId) {
            document.getElementById('messageTo').value = recipientId;
        }
        if (reportId) {
            document.getElementById('relatedReport').value = reportId;
        }

        document.getElementById('messageTo')?.focus();
    }

    /**
     * Hide compose form
     */
    hideCompose() {
        const composeSection = document.getElementById('composeSection');
        composeSection.classList.add('hidden');
        document.getElementById('composeForm')?.reset();
    }

    /**
     * Load available recipients
     */
    async loadRecipients() {
        const select = document.getElementById('messageTo');
        if (!select) return;

        try {
            // Try to get users from the app's database
            let users = [];
            
            if (window.app?.db) {
                // Use app's database helper
                users = await window.app.db.select('users');
                users = users.filter(u => u.role === 'admin' || u.role === 'staff');
            } else if (this.supabase) {
                // Fallback to direct Supabase query
                const { data, error } = await this.supabase
                    .from('users')
                    .select('id, name, email, role')
                    .in('role', ['admin', 'staff']);
                
                if (!error && data) {
                    users = data;
                }
            }

            if (users.length > 0) {
                select.innerHTML = '<option value="">Select recipient...</option>' +
                    users.map(user => `
                        <option value="${user.id}">${user.name || user.email} (${user.role})</option>
                    `).join('');
            } else {
                // Show default admin/staff options if no users found
                select.innerHTML = `
                    <option value="">Select recipient...</option>
                    <option value="admin">Admin Support</option>
                    <option value="staff">Staff Support</option>
                `;
            }
        } catch (error) {
            console.log('Error loading recipients:', error);
            // Show default options on error
            select.innerHTML = `
                <option value="">Select recipient...</option>
                <option value="admin">Admin Support</option>
                <option value="staff">Staff Support</option>
            `;
        }
    }

    /**
     * Load user's reports for linking
     */
    async loadReportsForLinking() {
        const select = document.getElementById('relatedReport');
        if (!select) return;

        const currentUser = window.app?.auth?.currentUser;
        if (!currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('reports')
                .select('id, category, subcategory, created_at')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            select.innerHTML = '<option value="">None</option>' +
                (data || []).map(report => `
                    <option value="${report.id}">${report.category} - ${report.subcategory} (${this.formatDate(report.created_at)})</option>
                `).join('');
        } catch (error) {
            console.log('Error loading reports:', error);
        }
    }

    /**
     * Handle send message
     */
    async handleSend(e) {
        e.preventDefault();

        const currentUser = window.app?.auth?.currentUser;
        if (!currentUser) {
            window.app?.showToast('Please log in to send messages', 'error');
            return;
        }

        const toUserId = document.getElementById('messageTo').value;
        const subject = document.getElementById('messageSubject').value;
        const body = document.getElementById('messageBody').value;
        const reportId = document.getElementById('relatedReport').value;

        if (!toUserId || !subject || !body) {
            window.app?.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('messages')
                .insert({
                    from_user_id: currentUser.id,
                    from_name: currentUser.user_metadata?.full_name || currentUser.email,
                    to_user_id: toUserId,
                    subject,
                    body,
                    report_id: reportId || null,
                    read: false
                });

            if (error) throw error;

            window.app?.showToast('Message sent successfully!', 'success');
            this.hideCompose();
            this.loadMessages('sent');
        } catch (error) {
            console.error('Error sending message:', error);
            window.app?.showToast('Failed to send message', 'error');
        }
    }

    /**
     * Open message detail
     */
    async openMessage(messageId) {
        // Mark as read
        try {
            await this.supabase
                .from('messages')
                .update({ read: true })
                .eq('id', messageId);
        } catch (error) {
            console.log('Error marking message as read:', error);
        }

        // For now, refresh the list
        this.loadMessages();
        this.updateUnreadBadge();
    }

    /**
     * Show assignment modal
     */
    async showAssignmentModal(reportId) {
        this.currentReportId = reportId;
        const modal = document.getElementById('assignmentModal');
        modal.classList.remove('hidden');
        
        // Load staff members
        await this.loadStaffForAssignment();
        this.updateSLAPreview();
        
        document.getElementById('assignToStaff')?.focus();
    }

    /**
     * Load staff for assignment
     */
    async loadStaffForAssignment() {
        const select = document.getElementById('assignToStaff');
        if (!select) return;

        try {
            let staffUsers = [];
            
            if (window.app?.db) {
                const users = await window.app.db.select('users');
                staffUsers = users.filter(u => u.role === 'staff');
            } else if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('id, name, email, role')
                    .eq('role', 'staff');
                
                if (!error && data) {
                    staffUsers = data;
                }
            }

            if (staffUsers.length > 0) {
                select.innerHTML = '<option value="">Select staff...</option>' +
                    staffUsers.map(staff => `
                        <option value="${staff.id}">${staff.name || staff.email}</option>
                    `).join('');
            } else {
                select.innerHTML = '<option value="">No staff available</option>';
            }
        } catch (error) {
            console.log('Error loading staff:', error);
            select.innerHTML = '<option value="">Error loading staff</option>';
        }
    }

    /**
     * Update SLA preview
     */
    updateSLAPreview() {
        const priority = document.getElementById('assignPriority')?.value || 'medium';
        const slaHours = this.slaConfig[priority]?.hours || 72;
        const deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
        
        document.getElementById('slaDeadline').textContent = 
            deadline.toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
    }

    /**
     * Handle assignment submission
     */
    async handleAssignment() {
        const staffId = document.getElementById('assignToStaff')?.value;
        const priority = document.getElementById('assignPriority')?.value;
        const notes = document.getElementById('assignNotes')?.value;

        if (!staffId || !this.currentReportId) {
            window.app?.showToast('Please select a staff member', 'error');
            return;
        }

        const slaHours = this.slaConfig[priority]?.hours || 72;
        const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

        try {
            // Create assignment
            const { error: assignError } = await this.supabase
                .from('report_assignments')
                .insert({
                    report_id: this.currentReportId,
                    assigned_to: staffId,
                    assigned_by: window.app?.auth?.currentUser?.id,
                    priority,
                    notes,
                    sla_deadline: slaDeadline.toISOString()
                });

            if (assignError) throw assignError;

            // Update report status
            await this.supabase
                .from('reports')
                .update({ 
                    status: 'assigned',
                    assigned_to: staffId
                })
                .eq('id', this.currentReportId);

            window.app?.showToast('Report assigned successfully!', 'success');
            this.closeModals();
            
            // Refresh admin dashboard if visible
            if (window.app) {
                window.app.loadAdminDashboard?.();
            }
        } catch (error) {
            console.error('Error assigning report:', error);
            window.app?.showToast('Failed to assign report', 'error');
        }
    }

    /**
     * Mark assignment as complete
     */
    async markComplete(assignmentId) {
        try {
            const { error } = await this.supabase
                .from('report_assignments')
                .update({ 
                    completed_at: new Date().toISOString(),
                    status: 'completed'
                })
                .eq('id', assignmentId);

            if (error) throw error;

            window.app?.showToast('Assignment marked complete!', 'success');
            this.loadAssignments();
        } catch (error) {
            console.error('Error completing assignment:', error);
            window.app?.showToast('Failed to complete assignment', 'error');
        }
    }

    /**
     * View report from assignment
     */
    viewReport(reportId) {
        // Navigate to report detail or admin view
        if (window.app) {
            this.closePanel();
            window.app.showPage('adminDashboard');
        }
    }

    /**
     * Close all modals
     */
    closeModals() {
        document.getElementById('assignmentModal')?.classList.add('hidden');
    }

    /**
     * Update unread badge
     */
    async updateUnreadBadge() {
        const currentUser = window.app?.auth?.currentUser;
        if (!currentUser) return;

        try {
            const { count, error } = await this.supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('to_user_id', currentUser.id)
                .eq('read', false);

            if (error) throw error;

            const badge = document.getElementById('unreadBadge');
            if (badge) {
                badge.textContent = count || 0;
                badge.classList.toggle('hidden', !count);
            }
        } catch (error) {
            console.log('Error updating unread badge:', error);
        }
    }

    /**
     * Show notification
     */
    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icons/icon-192x192.png' });
        }
    }

    /**
     * Format date
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString('en-IN', { dateStyle: 'short' });
    }
}

// Create global instance
const messagingManager = new MessagingManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessagingManager, messagingManager };
} else {
    window.MessagingManager = MessagingManager;
    window.messagingManager = messagingManager;
}
