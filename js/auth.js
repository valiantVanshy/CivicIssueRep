/**
 * Authentication Module
 * Handles user registration, login, logout, and session management
 */

class AuthManager {
    constructor(db) {
        this.db = db;
        this.currentUser = null;
        this.currentUserRole = null;
    }

    /**
     * Simple password hashing (client-side)
     * NOTE: In production, use proper server-side hashing with bcrypt
     */
    hashPassword(password) {
        // Simple hash for demonstration - replace with proper server-side bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `hashed_${Math.abs(hash)}_${password.length}`;
    }

    /**
     * Verify password against hash
     */
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    /**
     * Handle citizen registration
     */
    async registerCitizen(formData) {
        // Validate form data
        const validation = Validator.validateRegistrationForm(formData);
        if (!validation.valid) {
            validation.errors.forEach(error => {
                Validator.showFieldError(`citizenRegister${error.field.charAt(0).toUpperCase() + error.field.slice(1)}`, error.message);
            });
            throw new Error(validation.errors[0].message);
        }

        // Check if email already exists
        const existing = await this.db.select('users', { email: formData.email });
        if (existing.length > 0) {
            Validator.showFieldError('citizenRegisterEmail', 'Email already registered');
            throw new Error('Email already registered');
        }

        // Hash password
        const passwordHash = this.hashPassword(formData.password);

        // Insert user
        await this.db.insert('users', {
            name: formData.name,
            email: formData.email,
            password_hash: passwordHash,
            role: 'citizen',
            department: null
        });

        return { success: true, message: 'Registration successful!' };
    }

    /**
     * Handle citizen login
     */
    async loginCitizen(email, password) {
        // Validate inputs
        const emailValidation = Validator.validateEmail(email);
        if (!emailValidation.valid) {
            Validator.showFieldError('citizenLoginEmail', emailValidation.message);
            throw new Error(emailValidation.message);
        }

        // Find user
        const users = await this.db.select('users', { email, role: 'citizen' });
        if (users.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = users[0];
        
        // Verify password (for old records without hashing, also check plain password)
        const isValidPassword = this.verifyPassword(password, user.password_hash) || 
                               user.password_hash === password;

        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        // Set current user
        this.currentUser = user;
        this.currentUserRole = 'citizen';

        // Store session
        Utils.setLocalStorage('currentUser', {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'citizen'
        }, 24); // 24 hours

        return { success: true, user };
    }

    /**
     * Handle staff login
     */
    async loginStaff(email, password) {
        const users = await this.db.select('users', { email, role: 'staff' });
        if (users.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = users[0];
        const isValidPassword = this.verifyPassword(password, user.password_hash) || 
                               user.password_hash === password;

        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        this.currentUser = user;
        this.currentUserRole = 'staff';

        Utils.setLocalStorage('currentUser', {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'staff',
            department: user.department
        }, 24);

        return { success: true, user };
    }

    /**
     * Handle admin login
     */
    async loginAdmin(email, password) {
        const users = await this.db.select('users');
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'admin');

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValidPassword = this.verifyPassword(password, user.password_hash) || 
                               user.password_hash === password;

        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        this.currentUser = user;
        this.currentUserRole = 'admin';

        Utils.setLocalStorage('currentUser', {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'admin'
        }, 24);

        return { success: true, user };
    }

    /**
     * Handle logout
     */
    logout() {
        this.currentUser = null;
        this.currentUserRole = null;
        localStorage.removeItem('currentUser');
        return { success: true };
    }

    /**
     * Restore session from localStorage
     */
    restoreSession() {
        const userData = Utils.getLocalStorage('currentUser');
        if (userData) {
            this.currentUser = userData;
            this.currentUserRole = userData.role;
            return true;
        }
        return false;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.currentUserRole === role;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user role
     */
    getCurrentUserRole() {
        return this.currentUserRole;
    }

    /**
     * Apply role-based UI permissions
     */
    applyRoleBasedPermissions() {
        const isAdmin = this.currentUserRole === 'admin';
        const isStaff = this.currentUserRole === 'staff';

        // Users Tab - Admin only
        const usersTab = document.getElementById('usersTab');
        if (usersTab) usersTab.style.display = isAdmin ? 'block' : 'none';

        // Add User button - Admin only
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) addUserBtn.style.display = isAdmin ? 'inline-block' : 'none';

        // Export section - Admin and Staff
        const exportSection = document.getElementById('exportSection');
        if (exportSection) exportSection.style.display = (isAdmin || isStaff) ? 'block' : 'none';
    }

    /**
     * Create new user (admin only)
     */
    async createUser(formData) {
        if (this.currentUserRole !== 'admin') {
            throw new Error('Only administrators can create users');
        }

        // Validate
        if (!formData.name || !formData.email || !formData.password || !formData.role) {
            throw new Error('All fields are required');
        }

        if (formData.password !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        // Check existing email
        const existing = await this.db.select('users', { email: formData.email });
        if (existing.length > 0) {
            throw new Error('Email already exists');
        }

        // Hash password
        const passwordHash = this.hashPassword(formData.password);

        // Insert user
        await this.db.insert('users', {
            name: formData.name,
            email: formData.email,
            password_hash: passwordHash,
            role: formData.role,
            department: formData.department || null,
            created_at: new Date().toISOString()
        });

        return { success: true };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
} else {
    window.AuthManager = AuthManager;
}
