/**
 * Real-time Notifications using Supabase Subscriptions
 */

class RealtimeNotifications {
    constructor(supabase) {
        this.supabase = supabase;
        this.subscriptions = new Map();
        this.notificationQueue = [];
    }

    /**
     * Subscribe to report changes
     */
    subscribeToReports(callback) {
        const channel = this.supabase
            .channel('reports-channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reports'
                },
                (payload) => {
                    this.handleReportChange(payload, callback);
                }
            )
            .subscribe();

        this.subscriptions.set('reports', channel);
        return channel;
    }

    /**
     * Handle report changes
     */
    handleReportChange(payload, callback) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        let notification = {
            type: eventType,
            data: newRecord || oldRecord,
            timestamp: new Date()
        };

        // Create notification message
        switch (eventType) {
            case 'INSERT':
                notification.title = 'New Report Submitted';
                notification.message = `Report #${newRecord.id}: ${newRecord.title}`;
                notification.icon = '📝';
                notification.priority = newRecord.priority;
                break;
            
            case 'UPDATE':
                notification.title = 'Report Updated';
                notification.message = `Report #${newRecord.id} status: ${newRecord.status}`;
                notification.icon = '🔄';
                
                // Check what changed
                if (oldRecord && newRecord.status !== oldRecord.status) {
                    notification.message = `Report #${newRecord.id} status changed to ${newRecord.status}`;
                }
                break;
            
            case 'DELETE':
                notification.title = 'Report Deleted';
                notification.message = `Report #${oldRecord.id} was deleted`;
                notification.icon = '🗑️';
                break;
        }

        // Add to queue
        this.notificationQueue.push(notification);

        // Show notification
        this.showNotification(notification);

        // Call callback
        if (callback && typeof callback === 'function') {
            callback(notification);
        }
    }

    /**
     * Show notification
     */
    showNotification(notification) {
        // Check if browser notifications are supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/badge.png',
                tag: `report-${notification.data.id}`,
                requireInteraction: notification.priority === 'Emergency'
            });
        }

        // Show in-app notification
        this.showInAppNotification(notification);
    }

    /**
     * Show in-app notification
     */
    showInAppNotification(notification) {
        const container = this.getNotificationContainer();
        
        const notifEl = document.createElement('div');
        notifEl.className = 'realtime-notification';
        notifEl.innerHTML = `
            <div class="realtime-notification__icon">${notification.icon}</div>
            <div class="realtime-notification__content">
                <div class="realtime-notification__title">${notification.title}</div>
                <div class="realtime-notification__message">${notification.message}</div>
                <div class="realtime-notification__time">${this.getTimeAgo(notification.timestamp)}</div>
            </div>
            <button class="realtime-notification__close">×</button>
        `;

        // Add priority class
        if (notification.priority === 'Emergency' || notification.priority === 'High') {
            notifEl.classList.add('realtime-notification--urgent');
        }

        // Close button
        notifEl.querySelector('.realtime-notification__close').onclick = () => {
            notifEl.classList.add('realtime-notification--removing');
            setTimeout(() => notifEl.remove(), 300);
        };

        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notifEl.parentNode) {
                notifEl.classList.add('realtime-notification--removing');
                setTimeout(() => notifEl.remove(), 300);
            }
        }, 10000);

        container.appendChild(notifEl);

        // Animate in
        setTimeout(() => notifEl.classList.add('realtime-notification--show'), 10);

        // Play sound if critical
        if (notification.priority === 'Emergency') {
            this.playNotificationSound();
        }
    }

    /**
     * Get or create notification container
     */
    getNotificationContainer() {
        let container = document.getElementById('realtime-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'realtime-notifications';
            container.className = 'realtime-notifications-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Request browser notification permission
     */
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    /**
     * Unsubscribe from reports
     */
    unsubscribeFromReports() {
        const channel = this.subscriptions.get('reports');
        if (channel) {
            this.supabase.removeChannel(channel);
            this.subscriptions.delete('reports');
        }
    }

    /**
     * Unsubscribe from all
     */
    unsubscribeAll() {
        this.subscriptions.forEach(channel => {
            this.supabase.removeChannel(channel);
        });
        this.subscriptions.clear();
    }

    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKvo8LRkGwU7k9n0zHgrBSh+zPLaizsKGGS56+mjUBELTKXh8bllHAU2jdXvz4A0Bx9rtO3qnFELDU+k5O+zaBsFOJHY88t1KwUogcry2Yk3CBloue3nn00MDlCr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsGOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsFOJHY88t1KwUogcry2Yk3CBhpvPDknE4MD1Cr6PC0ZBsF');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors
    }

    /**
     * Get notification count
     */
    getNotificationCount() {
        return this.notificationQueue.length;
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        this.notificationQueue = [];
        const container = document.getElementById('realtime-notifications');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeNotifications;
} else {
    window.RealtimeNotifications = RealtimeNotifications;
}
