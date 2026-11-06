/**
 * Role-Based Access Control (RBAC) Manager
 * Handles permissions, session hardening, and role management
 */

class RBACManager {
    constructor() {
        this.roles = {
            CITIZEN: 'citizen',
            STAFF: 'staff',
            ADMIN: 'admin',
            SUPER_ADMIN: 'super_admin'
        };

        // Define permissions for each role
        this.permissions = {
            citizen: [
                'reports.create',
                'reports.view.own',
                'reports.edit.own',
                'profile.view.own',
                'profile.edit.own',
                'schemes.view',
                'map.view'
            ],
            staff: [
                'reports.create',
                'reports.view.all',
                'reports.view.own',
                'reports.edit.own',
                'reports.update.status',
                'reports.assign',
                'profile.view.own',
                'profile.edit.own',
                'dashboard.view',
                'analytics.view.basic',
                'map.view'
            ],
            admin: [
                'reports.create',
                'reports.view.all',
                'reports.edit.all',
                'reports.delete',
                'reports.update.status',
                'reports.assign',
                'users.view',
                'users.create',
                'users.edit',
                'users.delete',
                'profile.view.all',
                'profile.edit.own',
                'dashboard.view',
                'dashboard.admin',
                'analytics.view.all',
                'analytics.export',
                'settings.view',
                'settings.edit',
                'moderation.view',
                'moderation.action',
                'map.view',
                'map.admin'
            ],
            super_admin: [
                '*' // All permissions
            ]
        };

        // Session configuration
        this.sessionConfig = {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            refreshThreshold: 60 * 60 * 1000, // Refresh 1 hour before expiry
            inactivityTimeout: 30 * 60 * 1000, // 30 minutes inactivity
            maxConcurrentSessions: 3
        };

        this.lastActivity = Date.now();
        this.activityTimer = null;

        this.init();
    }

    init() {
        // Track user activity
        this.setupActivityTracking();
        
        // Session refresh timer
        this.setupSessionRefresh();
    }

    /**
     * Check if user has a specific permission
     */
    hasPermission(userRole, permission) {
        if (!userRole || !permission) return false;
        
        const rolePermissions = this.permissions[userRole] || [];
        
        // Super admin has all permissions
        if (rolePermissions.includes('*')) return true;
        
        // Check exact permission
        if (rolePermissions.includes(permission)) return true;
        
        // Check wildcard permissions (e.g., 'reports.*')
        const permissionParts = permission.split('.');
        for (let i = permissionParts.length - 1; i >= 0; i--) {
            const wildcardPerm = [...permissionParts.slice(0, i), '*'].join('.');
            if (rolePermissions.includes(wildcardPerm)) return true;
        }
        
        return false;
    }

    /**
     * Check multiple permissions (all must be true)
     */
    hasAllPermissions(userRole, permissions) {
        return permissions.every(perm => this.hasPermission(userRole, perm));
    }

    /**
     * Check multiple permissions (at least one must be true)
     */
    hasAnyPermission(userRole, permissions) {
        return permissions.some(perm => this.hasPermission(userRole, perm));
    }

    /**
     * Get all permissions for a role
     */
    getPermissions(userRole) {
        return this.permissions[userRole] || [];
    }

    /**
     * Apply role-based UI visibility
     */
    applyUIPermissions(userRole) {
        // Hide elements user doesn't have permission to see
        document.querySelectorAll('[data-permission]').forEach(el => {
            const permission = el.dataset.permission;
            if (!this.hasPermission(userRole, permission)) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        // Disable elements user doesn't have permission to use
        document.querySelectorAll('[data-permission-disable]').forEach(el => {
            const permission = el.dataset.permissionDisable;
            if (!this.hasPermission(userRole, permission)) {
                el.disabled = true;
                el.classList.add('disabled');
            } else {
                el.disabled = false;
                el.classList.remove('disabled');
            }
        });

        // Add role-specific body class
        document.body.classList.remove('role-citizen', 'role-staff', 'role-admin', 'role-super_admin');
        if (userRole) {
            document.body.classList.add(`role-${userRole}`);
        }
    }

    /**
     * Setup activity tracking for session timeout
     */
    setupActivityTracking() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        const updateActivity = () => {
            this.lastActivity = Date.now();
        };

        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check for inactivity
        this.activityTimer = setInterval(() => {
            this.checkInactivity();
        }, 60000); // Check every minute
    }

    /**
     * Check for user inactivity
     */
    checkInactivity() {
        const inactiveTime = Date.now() - this.lastActivity;
        
        if (inactiveTime > this.sessionConfig.inactivityTimeout) {
            this.handleInactivityTimeout();
        } else if (inactiveTime > this.sessionConfig.inactivityTimeout - 60000) {
            // Warn user 1 minute before timeout
            this.showInactivityWarning();
        }
    }

    /**
     * Handle inactivity timeout
     */
    handleInactivityTimeout() {
        console.log('[RBAC] Session timeout due to inactivity');
        
        // Clear session
        if (window.app && window.app.auth) {
            window.app.auth.logout();
            window.app.showToast('Session expired due to inactivity. Please login again.', 'warning');
            window.app.showPage('loginSelectionPage');
        }
    }

    /**
     * Show inactivity warning
     */
    showInactivityWarning() {
        if (window.app) {
            window.app.showToast('Session will expire soon due to inactivity. Move your mouse to stay logged in.', 'warning');
        }
    }

    /**
     * Setup session refresh
     */
    setupSessionRefresh() {
        setInterval(() => {
            this.refreshSessionIfNeeded();
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    /**
     * Refresh session if needed
     */
    async refreshSessionIfNeeded() {
        if (!window.app || !window.app.auth || !window.app.auth.isAuthenticated()) {
            return;
        }

        const session = window.app.auth.getSession();
        if (!session) return;

        const expiresAt = session.expires_at * 1000;
        const timeUntilExpiry = expiresAt - Date.now();

        if (timeUntilExpiry < this.sessionConfig.refreshThreshold) {
            console.log('[RBAC] Refreshing session...');
            try {
                await window.app.auth.refreshSession();
            } catch (error) {
                console.error('[RBAC] Failed to refresh session:', error);
            }
        }
    }

    /**
     * Validate session token
     */
    validateSession(token) {
        if (!token) return false;

        try {
            // Decode JWT (basic validation - server should do full validation)
            const parts = token.split('.');
            if (parts.length !== 3) return false;

            const payload = JSON.parse(atob(parts[1]));
            
            // Check expiration
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.log('[RBAC] Session token expired');
                return false;
            }

            return true;
        } catch (error) {
            console.error('[RBAC] Invalid session token:', error);
            return false;
        }
    }

    /**
     * Generate CSRF token
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verify CSRF token
     */
    verifyCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return token && storedToken && token === storedToken;
    }

    /**
     * Setup CSRF protection
     */
    setupCSRFProtection() {
        const csrfToken = this.generateCSRFToken();
        sessionStorage.setItem('csrf_token', csrfToken);

        // Add to all form submissions
        document.querySelectorAll('form').forEach(form => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_csrf';
            input.value = csrfToken;
            form.appendChild(input);
        });

        return csrfToken;
    }

    /**
     * Log security event
     */
    logSecurityEvent(eventType, details) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            userId: window.app?.currentUser?.id,
            userRole: window.app?.currentUserRole,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.log('[SECURITY]', event);

        // Store in audit log if available
        if (window.app && window.app.db) {
            window.app.db.insert('audit_logs', event).catch(console.error);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RBACManager;
} else {
    window.RBACManager = RBACManager;
    window.rbacManager = new RBACManager();
}
