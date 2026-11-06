/**
 * Internationalization (i18n) Manager
 * Provides multilingual support with English, Hindi, and regional languages
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = {
            'en': { name: 'English', native: 'English', dir: 'ltr' },
            'hi': { name: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
            'ta': { name: 'Tamil', native: 'தமிழ்', dir: 'ltr' },
            'te': { name: 'Telugu', native: 'తెలుగు', dir: 'ltr' },
            'bn': { name: 'Bengali', native: 'বাংলা', dir: 'ltr' },
            'mr': { name: 'Marathi', native: 'मराठी', dir: 'ltr' },
            'gu': { name: 'Gujarati', native: 'ગુજરાતી', dir: 'ltr' },
            'kn': { name: 'Kannada', native: 'ಕನ್ನಡ', dir: 'ltr' },
            'ml': { name: 'Malayalam', native: 'മലയാളം', dir: 'ltr' },
            'pa': { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', dir: 'ltr' },
            'or': { name: 'Odia', native: 'ଓଡ଼ିଆ', dir: 'ltr' }
        };
        this.init();
    }

    /**
     * Initialize i18n
     */
    async init() {
        // Load saved language preference
        const saved = localStorage.getItem('saksham-language');
        if (saved && this.supportedLanguages[saved]) {
            this.currentLanguage = saved;
        } else {
            // Detect browser language
            const browserLang = navigator.language.split('-')[0];
            if (this.supportedLanguages[browserLang]) {
                this.currentLanguage = browserLang;
            }
        }

        // Load translations
        await this.loadTranslations(this.currentLanguage);
        
        // Create language selector
        this.createLanguageSelector();
        
        // Apply translations
        this.applyTranslations();
    }

    /**
     * Load translations for a language
     */
    async loadTranslations(lang) {
        // Default to English translations (embedded for reliability)
        this.translations = this.getTranslations(lang);
    }

    /**
     * Get translations object for a language
     */
    getTranslations(lang) {
        const translations = {
            'en': {
                // Navigation
                'nav.home': 'Home',
                'nav.reports': 'My Reports',
                'nav.new_report': 'New Report',
                'nav.profile': 'Profile',
                'nav.logout': 'Logout',
                'nav.login': 'Login',
                'nav.dashboard': 'Dashboard',
                
                // Common
                'common.submit': 'Submit',
                'common.cancel': 'Cancel',
                'common.save': 'Save',
                'common.delete': 'Delete',
                'common.edit': 'Edit',
                'common.view': 'View',
                'common.close': 'Close',
                'common.loading': 'Loading...',
                'common.error': 'Error',
                'common.success': 'Success',
                'common.search': 'Search',
                'common.filter': 'Filter',
                'common.all': 'All',
                'common.yes': 'Yes',
                'common.no': 'No',
                
                // Login
                'login.title': 'Welcome to SAKSHAM',
                'login.subtitle': 'Choose your login type',
                'login.citizen': 'Citizen Login',
                'login.staff': 'Staff Login',
                'login.admin': 'Admin Login',
                'login.email': 'Email Address',
                'login.password': 'Password',
                'login.signin': 'Sign In',
                'login.signup': 'Sign Up',
                'login.forgot': 'Forgot Password?',
                'login.no_account': "Don't have an account?",
                'login.have_account': 'Already have an account?',
                
                // Reports
                'report.new': 'Submit New Report',
                'report.category': 'Category',
                'report.subcategory': 'Subcategory',
                'report.description': 'Description',
                'report.location': 'Location',
                'report.photo': 'Photo',
                'report.status': 'Status',
                'report.date': 'Date',
                'report.priority': 'Priority',
                'report.submit_success': 'Report submitted successfully!',
                'report.my_reports': 'My Reports',
                'report.no_reports': 'No reports found',
                
                // Status
                'status.pending': 'Pending',
                'status.assigned': 'Assigned',
                'status.in_progress': 'In Progress',
                'status.resolved': 'Resolved',
                'status.rejected': 'Rejected',
                
                // Categories
                'category.water': 'Water Supply',
                'category.road': 'Roads',
                'category.electricity': 'Electricity',
                'category.sanitation': 'Sanitation',
                'category.health': 'Health',
                'category.education': 'Education',
                'category.other': 'Other',
                
                // Admin
                'admin.dashboard': 'Admin Dashboard',
                'admin.total_reports': 'Total Reports',
                'admin.pending_reports': 'Pending',
                'admin.resolved_reports': 'Resolved',
                'admin.assign': 'Assign',
                'admin.statistics': 'Statistics',
                
                // Messaging
                'msg.inbox': 'Inbox',
                'msg.sent': 'Sent',
                'msg.compose': 'Compose',
                'msg.to': 'To',
                'msg.subject': 'Subject',
                'msg.message': 'Message',
                'msg.send': 'Send',
                
                // Accessibility
                'a11y.skip_to_content': 'Skip to main content',
                'a11y.menu': 'Menu',
                'a11y.close_menu': 'Close menu',
                'a11y.dark_mode': 'Toggle dark mode',
                'a11y.language': 'Select language',
                
                // Chatbot
                'chat.title': 'SAKSHAM Assistant',
                'chat.placeholder': 'Type your question...',
                'chat.send': 'Send',
                'chat.voice': 'Voice input',
                
                // Offline
                'offline.indicator': 'You are offline',
                'offline.queued': 'Report queued for sync'
            },
            
            'hi': {
                // Navigation
                'nav.home': 'होम',
                'nav.reports': 'मेरी शिकायतें',
                'nav.new_report': 'नई शिकायत',
                'nav.profile': 'प्रोफ़ाइल',
                'nav.logout': 'लॉग आउट',
                'nav.login': 'लॉग इन',
                'nav.dashboard': 'डैशबोर्ड',
                
                // Common
                'common.submit': 'जमा करें',
                'common.cancel': 'रद्द करें',
                'common.save': 'सहेजें',
                'common.delete': 'हटाएं',
                'common.edit': 'संपादित करें',
                'common.view': 'देखें',
                'common.close': 'बंद करें',
                'common.loading': 'लोड हो रहा है...',
                'common.error': 'त्रुटि',
                'common.success': 'सफलता',
                'common.search': 'खोजें',
                'common.filter': 'फ़िल्टर',
                'common.all': 'सभी',
                'common.yes': 'हाँ',
                'common.no': 'नहीं',
                
                // Login
                'login.title': 'साक्षम में आपका स्वागत है',
                'login.subtitle': 'अपना लॉगिन प्रकार चुनें',
                'login.citizen': 'नागरिक लॉगिन',
                'login.staff': 'स्टाफ लॉगिन',
                'login.admin': 'व्यवस्थापक लॉगिन',
                'login.email': 'ईमेल पता',
                'login.password': 'पासवर्ड',
                'login.signin': 'साइन इन',
                'login.signup': 'साइन अप',
                'login.forgot': 'पासवर्ड भूल गए?',
                'login.no_account': 'खाता नहीं है?',
                'login.have_account': 'पहले से खाता है?',
                
                // Reports
                'report.new': 'नई शिकायत दर्ज करें',
                'report.category': 'श्रेणी',
                'report.subcategory': 'उप-श्रेणी',
                'report.description': 'विवरण',
                'report.location': 'स्थान',
                'report.photo': 'फ़ोटो',
                'report.status': 'स्थिति',
                'report.date': 'तारीख',
                'report.priority': 'प्राथमिकता',
                'report.submit_success': 'शिकायत सफलतापूर्वक दर्ज हो गई!',
                'report.my_reports': 'मेरी शिकायतें',
                'report.no_reports': 'कोई शिकायत नहीं मिली',
                
                // Status
                'status.pending': 'लंबित',
                'status.assigned': 'सौंपी गई',
                'status.in_progress': 'प्रगति में',
                'status.resolved': 'हल किया गया',
                'status.rejected': 'अस्वीकृत',
                
                // Categories
                'category.water': 'पानी आपूर्ति',
                'category.road': 'सड़कें',
                'category.electricity': 'बिजली',
                'category.sanitation': 'स्वच्छता',
                'category.health': 'स्वास्थ्य',
                'category.education': 'शिक्षा',
                'category.other': 'अन्य',
                
                // Admin
                'admin.dashboard': 'व्यवस्थापक डैशबोर्ड',
                'admin.total_reports': 'कुल शिकायतें',
                'admin.pending_reports': 'लंबित',
                'admin.resolved_reports': 'हल की गईं',
                'admin.assign': 'सौंपें',
                'admin.statistics': 'आंकड़े',
                
                // Messaging
                'msg.inbox': 'इनबॉक्स',
                'msg.sent': 'भेजे गए',
                'msg.compose': 'लिखें',
                'msg.to': 'प्रति',
                'msg.subject': 'विषय',
                'msg.message': 'संदेश',
                'msg.send': 'भेजें',
                
                // Accessibility
                'a11y.skip_to_content': 'मुख्य सामग्री पर जाएं',
                'a11y.menu': 'मेन्यू',
                'a11y.close_menu': 'मेन्यू बंद करें',
                'a11y.dark_mode': 'डार्क मोड टॉगल करें',
                'a11y.language': 'भाषा चुनें',
                
                // Chatbot
                'chat.title': 'साक्षम सहायक',
                'chat.placeholder': 'अपना प्रश्न लिखें...',
                'chat.send': 'भेजें',
                'chat.voice': 'आवाज इनपुट',
                
                // Offline
                'offline.indicator': 'आप ऑफ़लाइन हैं',
                'offline.queued': 'शिकायत सिंक के लिए कतार में है'
            },
            
            'ta': {
                'nav.home': 'முகப்பு',
                'nav.reports': 'என் புகார்கள்',
                'nav.new_report': 'புதிய புகார்',
                'nav.logout': 'வெளியேறு',
                'common.submit': 'சமர்ப்பி',
                'common.cancel': 'ரத்து செய்',
                'login.title': 'சாக்ஷாமில் வரவேற்கிறோம்',
                'report.new': 'புதிய புகாரைப் பதிவு செய்க',
                'status.pending': 'நிலுவையில்',
                'status.resolved': 'தீர்க்கப்பட்டது'
            },
            
            'te': {
                'nav.home': 'హోమ్',
                'nav.reports': 'నా ఫిర్యాదులు',
                'nav.new_report': 'కొత్త ఫిర్యాదు',
                'nav.logout': 'లాగ్ అవుట్',
                'common.submit': 'సమర్పించు',
                'common.cancel': 'రద్దు చేయి',
                'login.title': 'సాక్షమ్‌కు స్వాగతం',
                'report.new': 'కొత్త ఫిర్యాదు నమోదు చేయండి',
                'status.pending': 'పెండింగ్‌లో ఉంది',
                'status.resolved': 'పరిష్కరించబడింది'
            },
            
            'bn': {
                'nav.home': 'হোম',
                'nav.reports': 'আমার অভিযোগ',
                'nav.new_report': 'নতুন অভিযোগ',
                'nav.logout': 'লগ আউট',
                'common.submit': 'জমা দিন',
                'common.cancel': 'বাতিল',
                'login.title': 'সাক্ষম-এ স্বাগতম',
                'report.new': 'নতুন অভিযোগ দাখিল করুন',
                'status.pending': 'মুলতুবি',
                'status.resolved': 'সমাধান হয়েছে'
            },
            
            'mr': {
                'nav.home': 'मुख्यपृष्ठ',
                'nav.reports': 'माझ्या तक्रारी',
                'nav.new_report': 'नवीन तक्रार',
                'nav.logout': 'बाहेर पडा',
                'common.submit': 'सबमिट करा',
                'common.cancel': 'रद्द करा',
                'login.title': 'साक्षम मध्ये आपले स्वागत',
                'report.new': 'नवीन तक्रार नोंदवा',
                'status.pending': 'प्रलंबित',
                'status.resolved': 'निराकरण झाले'
            }
        };

        // Return requested language or fall back to English
        return translations[lang] || translations['en'];
    }

    /**
     * Create language selector UI
     */
    createLanguageSelector() {
        // Check if already exists
        if (document.getElementById('languageSelector')) return;

        const selector = document.createElement('div');
        selector.id = 'languageSelector';
        selector.className = 'language-selector';
        selector.innerHTML = `
            <button class="language-btn" aria-label="Select language" aria-haspopup="true" aria-expanded="false">
                🌐 ${this.supportedLanguages[this.currentLanguage]?.native || 'English'}
            </button>
            <div class="language-dropdown hidden" role="menu">
                ${Object.entries(this.supportedLanguages).map(([code, lang]) => `
                    <button class="language-option ${code === this.currentLanguage ? 'active' : ''}" 
                            data-lang="${code}" 
                            role="menuitem"
                            aria-label="${lang.name}">
                        ${lang.native}
                    </button>
                `).join('')}
            </div>
        `;

        // Insert after dark mode toggle
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.appendChild(selector);
        }

        // Event listeners
        const btn = selector.querySelector('.language-btn');
        const dropdown = selector.querySelector('.language-dropdown');

        btn?.addEventListener('click', () => {
            const isExpanded = dropdown.classList.toggle('hidden');
            btn.setAttribute('aria-expanded', !isExpanded);
        });

        selector.querySelectorAll('.language-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                this.setLanguage(e.target.dataset.lang);
                dropdown.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!selector.contains(e.target)) {
                dropdown.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // Keyboard navigation
        selector.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
                btn.focus();
            }
        });
    }

    /**
     * Set active language
     */
    async setLanguage(lang) {
        if (!this.supportedLanguages[lang]) {
            console.warn(`Language ${lang} not supported`);
            return;
        }

        this.currentLanguage = lang;
        localStorage.setItem('saksham-language', lang);
        
        // Load translations
        await this.loadTranslations(lang);
        
        // Apply to document
        document.documentElement.lang = lang;
        document.documentElement.dir = this.supportedLanguages[lang].dir;
        
        // Update UI
        this.applyTranslations();
        this.updateLanguageSelector();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang }
        }));

        // Show confirmation
        window.app?.showToast(`Language changed to ${this.supportedLanguages[lang].name}`, 'success');
    }

    /**
     * Update language selector button text
     */
    updateLanguageSelector() {
        const btn = document.querySelector('.language-btn');
        if (btn) {
            btn.innerHTML = `🌐 ${this.supportedLanguages[this.currentLanguage]?.native || 'English'}`;
        }

        document.querySelectorAll('.language-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === this.currentLanguage);
        });
    }

    /**
     * Apply translations to the document
     */
    applyTranslations() {
        // Find all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) {
                    el.placeholder = translation;
                }
            } else {
                el.textContent = translation;
            }
        });

        // Handle data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Handle data-i18n-aria
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            el.setAttribute('aria-label', this.t(key));
        });

        // Handle data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.setAttribute('title', this.t(key));
        });
    }

    /**
     * Translate a key
     */
    t(key, params = {}) {
        let text = this.translations[key];
        
        // Fall back to English
        if (!text && this.currentLanguage !== 'en') {
            const enTranslations = this.getTranslations('en');
            text = enTranslations[key];
        }
        
        // Fall back to key itself
        if (!text) {
            text = key;
        }

        // Replace parameters
        Object.entries(params).forEach(([param, value]) => {
            text = text.replace(`{${param}}`, value);
        });

        return text;
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get language info
     */
    getLanguageInfo(lang = null) {
        return this.supportedLanguages[lang || this.currentLanguage];
    }

    /**
     * Check if language is RTL
     */
    isRTL(lang = null) {
        const langInfo = this.supportedLanguages[lang || this.currentLanguage];
        return langInfo?.dir === 'rtl';
    }

    /**
     * Format number according to locale
     */
    formatNumber(number, options = {}) {
        try {
            return new Intl.NumberFormat(this.currentLanguage, options).format(number);
        } catch {
            return number.toString();
        }
    }

    /**
     * Format date according to locale
     */
    formatDate(date, options = { dateStyle: 'medium' }) {
        try {
            const d = date instanceof Date ? date : new Date(date);
            return new Intl.DateTimeFormat(this.currentLanguage, options).format(d);
        } catch {
            return date.toString();
        }
    }

    /**
     * Format currency according to locale
     */
    formatCurrency(amount, currency = 'INR') {
        try {
            return new Intl.NumberFormat(this.currentLanguage, {
                style: 'currency',
                currency
            }).format(amount);
        } catch {
            return `₹${amount}`;
        }
    }
}

// Create global instance
const i18n = new I18nManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nManager, i18n };
} else {
    window.I18nManager = I18nManager;
    window.i18n = i18n;
}
