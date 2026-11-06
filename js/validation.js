/**
 * Form Validation Utility
 * Provides comprehensive validation with user-friendly error messages
 */

class Validator {
    /**
     * Validate email address
     */
    static validateEmail(email) {
        if (!email || email.trim() === '') {
            return { valid: false, message: 'Email is required' };
        }
        
        const emailRegex = Config.validation.email;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        
        return { valid: true };
    }

    /**
     * Validate password with strength requirements
     */
    static validatePassword(password) {
        if (!password || password.trim() === '') {
            return { valid: false, message: 'Password is required' };
        }
        
        if (password.length < Config.security.passwordMinLength) {
            return { 
                valid: false, 
                message: `Password must be at least ${Config.security.passwordMinLength} characters long` 
            };
        }

        // Check for at least one letter and one number for stronger passwords
        if (!/[a-zA-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one letter' };
        }
        
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        
        return { valid: true };
    }

    /**
     * Validate password confirmation
     */
    static validatePasswordMatch(password, confirmPassword) {
        if (password !== confirmPassword) {
            return { valid: false, message: 'Passwords do not match' };
        }
        return { valid: true };
    }

    /**
     * Validate name
     */
    static validateName(name) {
        if (!name || name.trim() === '') {
            return { valid: false, message: 'Name is required' };
        }
        
        if (name.trim().length < 2) {
            return { valid: false, message: 'Name must be at least 2 characters long' };
        }
        
        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return { valid: false, message: 'Name can only contain letters and spaces' };
        }
        
        return { valid: true };
    }

    /**
     * Validate phone number
     */
    static validatePhone(phone) {
        if (!phone || phone.trim() === '') {
            return { valid: true }; // Optional field
        }
        
        const phoneRegex = Config.validation.phone;
        if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
            return { valid: false, message: 'Please enter a valid 10-digit phone number' };
        }
        
        return { valid: true };
    }

    /**
     * Validate report title
     */
    static validateTitle(title) {
        if (!title || title.trim() === '') {
            return { valid: false, message: 'Title is required' };
        }
        
        if (title.trim().length < Config.validation.minTitleLength) {
            return { 
                valid: false, 
                message: `Title must be at least ${Config.validation.minTitleLength} characters long` 
            };
        }
        
        if (title.length > Config.validation.maxTitleLength) {
            return { 
                valid: false, 
                message: `Title cannot exceed ${Config.validation.maxTitleLength} characters` 
            };
        }
        
        return { valid: true };
    }

    /**
     * Validate report description
     */
    static validateDescription(description) {
        if (!description || description.trim() === '') {
            return { valid: false, message: 'Description is required' };
        }
        
        if (description.trim().length < Config.validation.minDescriptionLength) {
            return { 
                valid: false, 
                message: `Description must be at least ${Config.validation.minDescriptionLength} characters long. Please provide more details.` 
            };
        }
        
        if (description.length > Config.validation.maxDescriptionLength) {
            return { 
                valid: false, 
                message: `Description cannot exceed ${Config.validation.maxDescriptionLength} characters` 
            };
        }
        
        return { valid: true };
    }

    /**
     * Validate selection (dropdown)
     */
    static validateSelection(value, fieldName = 'This field') {
        if (!value || value === '') {
            return { valid: false, message: `${fieldName} is required` };
        }
        return { valid: true };
    }

    /**
     * Validate file upload
     */
    static validateFile(file) {
        if (!file) {
            return { valid: true }; // Optional
        }
        
        // Check file type
        if (!Config.upload.allowedImageTypes.includes(file.type)) {
            return { 
                valid: false, 
                message: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)' 
            };
        }
        
        // Check file size
        if (file.size > Config.upload.maxFileSize) {
            const maxSizeMB = Config.upload.maxFileSize / (1024 * 1024);
            return { 
                valid: false, 
                message: `File size must be less than ${maxSizeMB}MB` 
            };
        }
        
        return { valid: true };
    }

    /**
     * Show validation error on form field
     */
    static showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove existing error
        this.clearFieldError(fieldId);
        
        // Add error styling
        field.classList.add('field-error');
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.textContent = message;
        errorDiv.id = `${fieldId}-error`;
        
        // Insert after the field
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }

    /**
     * Clear validation error from form field
     */
    static clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.classList.remove('field-error');
        
        const errorDiv = document.getElementById(`${fieldId}-error`);
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * Validate complete registration form
     */
    static validateRegistrationForm(formData) {
        const errors = [];
        
        const nameValidation = this.validateName(formData.name);
        if (!nameValidation.valid) errors.push({ field: 'name', ...nameValidation });
        
        const emailValidation = this.validateEmail(formData.email);
        if (!emailValidation.valid) errors.push({ field: 'email', ...emailValidation });
        
        const passwordValidation = this.validatePassword(formData.password);
        if (!passwordValidation.valid) errors.push({ field: 'password', ...passwordValidation });
        
        const matchValidation = this.validatePasswordMatch(formData.password, formData.confirmPassword);
        if (!matchValidation.valid) errors.push({ field: 'confirmPassword', ...matchValidation });
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate complete report form
     */
    static validateReportForm(formData) {
        const errors = [];
        
        const titleValidation = this.validateTitle(formData.title);
        if (!titleValidation.valid) errors.push({ field: 'title', ...titleValidation });
        
        const descriptionValidation = this.validateDescription(formData.description);
        if (!descriptionValidation.valid) errors.push({ field: 'description', ...descriptionValidation });
        
        const categoryValidation = this.validateSelection(formData.category, 'Category');
        if (!categoryValidation.valid) errors.push({ field: 'category', ...categoryValidation });
        
        const priorityValidation = this.validateSelection(formData.priority, 'Priority');
        if (!priorityValidation.valid) errors.push({ field: 'priority', ...priorityValidation });
        
        if (formData.photo) {
            const fileValidation = this.validateFile(formData.photo);
            if (!fileValidation.valid) errors.push({ field: 'photoInput', ...fileValidation });
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validator;
} else {
    window.Validator = Validator;
}
