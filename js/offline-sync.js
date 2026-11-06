/**
 * Offline Sync Manager
 * Handles offline submission queue, background sync, and conflict resolution
 */

class OfflineSyncManager {
    constructor() {
        this.DB_NAME = 'saksham-offline';
        this.STORE_NAME = 'pending-reports';
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        
        this.init();
    }

    async init() {
        // Open IndexedDB
        this.db = await this.openDatabase();
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Register service worker sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            this.registerBackgroundSync();
        }
        
        // Sync any pending reports on load
        if (this.isOnline) {
            this.syncPendingReports();
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    /**
     * Queue a report for offline submission
     */
    async queueReport(reportData) {
        const record = {
            ...reportData,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        };
        
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => {
                this.showOfflineToast('Report saved offline. Will sync when online.');
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending reports
     */
    async getPendingReports() {
        const tx = this.db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const index = store.index('status');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll('pending');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update report status
     */
    async updateReportStatus(id, status, serverResponse = null) {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.status = status;
                    record.syncedAt = status === 'synced' ? Date.now() : null;
                    record.serverResponse = serverResponse;
                    
                    const putRequest = store.put(record);
                    putRequest.onsuccess = () => resolve(record);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Record not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Delete synced reports
     */
    async clearSyncedReports() {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const index = store.index('status');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only('synced'));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Sync all pending reports
     */
    async syncPendingReports() {
        if (this.syncInProgress || !this.isOnline) return;
        
        this.syncInProgress = true;
        const pending = await this.getPendingReports();
        
        if (pending.length === 0) {
            this.syncInProgress = false;
            return;
        }
        
        console.log(`[OfflineSync] Syncing ${pending.length} pending reports...`);
        this.showSyncProgress(0, pending.length);
        
        let synced = 0;
        let failed = 0;
        
        for (const report of pending) {
            try {
                // Attempt to submit the report
                const response = await this.submitReport(report);
                
                if (response.success) {
                    await this.updateReportStatus(report.id, 'synced', response);
                    synced++;
                } else {
                    // Handle conflict
                    if (response.conflict) {
                        await this.handleConflict(report, response);
                    } else {
                        report.retryCount++;
                        await this.updateReportStatus(report.id, 'error', response);
                        failed++;
                    }
                }
            } catch (error) {
                console.error('[OfflineSync] Failed to sync report:', error);
                report.retryCount++;
                failed++;
            }
            
            this.showSyncProgress(synced + failed, pending.length);
        }
        
        // Clean up synced reports
        await this.clearSyncedReports();
        
        this.syncInProgress = false;
        
        if (synced > 0) {
            this.showOfflineToast(`✅ ${synced} report(s) synced successfully`);
        }
        if (failed > 0) {
            this.showOfflineToast(`⚠️ ${failed} report(s) failed to sync. Will retry.`);
        }
    }

    /**
     * Submit report to server
     */
    async submitReport(report) {
        // Remove offline-specific fields
        const { id, timestamp, status, retryCount, syncedAt, serverResponse, ...reportData } = report;
        
        try {
            // Use window.app.db if available
            if (window.app && window.app.db) {
                const result = await window.app.db.insert('reports', reportData);
                return { success: true, data: result };
            }
            
            // Fallback to direct API call
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                return { success: false, error: response.statusText };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle data conflict during sync
     */
    async handleConflict(localReport, serverResponse) {
        // Strategy: Server wins, but preserve local changes
        console.log('[OfflineSync] Conflict detected for report:', localReport.id);
        
        // Mark as conflict for user review
        await this.updateReportStatus(localReport.id, 'conflict', serverResponse);
        
        // Notify user
        this.showOfflineToast('⚠️ Sync conflict detected. Please review your pending reports.');
    }

    /**
     * Handle coming online
     */
    handleOnline() {
        this.isOnline = true;
        console.log('[OfflineSync] Back online');
        this.showOfflineToast('🌐 Back online. Syncing pending reports...');
        
        // Wait a moment for connection to stabilize
        setTimeout(() => this.syncPendingReports(), 1000);
    }

    /**
     * Handle going offline
     */
    handleOffline() {
        this.isOnline = false;
        console.log('[OfflineSync] Gone offline');
        this.showOfflineToast('📴 You are offline. Reports will be saved locally.');
    }

    /**
     * Register background sync
     */
    async registerBackgroundSync() {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-reports');
            console.log('[OfflineSync] Background sync registered');
        } catch (error) {
            console.warn('[OfflineSync] Background sync not supported:', error);
        }
    }

    /**
     * Show offline status toast
     */
    showOfflineToast(message) {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, this.isOnline ? 'success' : 'warning');
        } else {
            console.log('[OfflineSync]', message);
        }
    }

    /**
     * Show sync progress
     */
    showSyncProgress(current, total) {
        const progressBar = document.getElementById('syncProgress');
        if (progressBar) {
            progressBar.style.width = `${(current / total) * 100}%`;
            progressBar.textContent = `${current}/${total}`;
        }
    }

    /**
     * Get offline status indicator
     */
    getOfflineIndicator() {
        return `
            <div id="offlineIndicator" class="offline-indicator ${this.isOnline ? 'online' : 'offline'}">
                <span class="offline-indicator__icon">${this.isOnline ? '🌐' : '📴'}</span>
                <span class="offline-indicator__text">${this.isOnline ? 'Online' : 'Offline'}</span>
            </div>
        `;
    }

    /**
     * Get pending count for UI
     */
    async getPendingCount() {
        const pending = await this.getPendingReports();
        return pending.length;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineSyncManager;
} else {
    window.OfflineSyncManager = OfflineSyncManager;
    // Auto-initialize
    window.offlineSyncManager = new OfflineSyncManager();
}
