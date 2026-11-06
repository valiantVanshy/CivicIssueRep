// SQLite-Powered CivicReport System - Main Application Logic
// Using modular configuration and utilities

class CivicReportSupabaseDB {
    constructor() {
        // Use Config for API credentials
        const SUPABASE_URL = Config.supabase.url;
        const SUPABASE_ANON_KEY = Config.supabase.anonKey;

        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    async init() {
        try {
            // Test connection and initialize default data
            await this.initializeDefaultData();
            console.log('Supabase database initialized successfully');
            return true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async initializeDefaultData() {
        // Categories are now managed via SQL - just verify they exist
        const categories = await this.select('categories');
        console.log('Categories loaded from database:', categories.length);
    }


    async insert(tableName, data) {
        const { data: inserted, error } = await this.supabase
            .from(tableName)
            .insert([data])
            .select();
        if (error) throw error;
        return inserted[0];
    }

    async select(tableName, where = null, orderBy = null) {
        let query = this.supabase.from(tableName).select("*");
        
        if (where) {
            Object.entries(where).forEach(([key, value]) => {
                if (typeof value === "object" && value.like) {
                    query = query.ilike(key, `%${value.like}%`);
                } else {
                    query = query.eq(key, value);
                }
            });
        }

        if (orderBy) {
            query = query.order(orderBy.field, { ascending: orderBy.direction !== "DESC" });
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async update(tableName, data, where) {
        let query = this.supabase.from(tableName).update(data);
        if (where) {
            Object.entries(where).forEach(([k, v]) => {
                query = query.eq(k, v);
            });
        }
        const { data: updated, error } = await query.select();
        if (error) throw error;
        return updated;
    }
    

    async delete(table, where) {
        let q = this.supabase.from(table).delete();
        Object.entries(where).forEach(([k,v]) => q = q.eq(k,v));
        const { error } = await q;
        if (error) throw error;
    }



    async count(tableName, where = null) {
        let query = this.supabase.from(tableName).select("*", { count: "exact", head: true });
        if (where) {
            Object.entries(where).forEach(([k, v]) => {
                query = query.eq(k, v);
            });
        }
        const { count, error } = await query;
        if (error) throw error;
        return count;
    }

    async getReportsWithDetails() {
        const reports = await this.select("reports", null, { field: "created_at", direction: "DESC" });
        const categories = await this.select("categories");
        const departments = await this.select("departments");

        return reports.map(report => ({
            ...report,
            category_details: categories.find(c => c.name === report.category),
            department_details: departments.find(d => d.name === report.assigned_department),
        }));
    }

    async getReportStatistics() {
        const reports = await this.select("reports");
        return {
            total: reports.length,
            pending: reports.filter(r => r.status === "Pending").length,
            inProgress: reports.filter(r => r.status === "In Progress").length,
            resolved: reports.filter(r => r.status === "Resolved").length,
            byCategory: reports.reduce((acc, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
            }, {}),
            byDepartment: reports.reduce((acc, r) => {
                acc[r.assigned_department] = (acc[r.assigned_department] || 0) + 1;
                return acc;
            }, {}),
            byPriority: reports.reduce((acc, r) => {
                acc[r.priority] = (acc[r.priority] || 0) + 1;
                return acc;
            }, {}),
        };
    }
}


class CivicReportApp {
    constructor() {
        this.db = new CivicReportSupabaseDB();

        // Initialize AuthManager with database
        this.auth = new AuthManager(this.db);

        this.currentPage = 'landingPage';
        this.map = null;
        this.charts = {};
        this.currentLocation = null;
        this.isInitialized = false;
        this.wsConnection = null; // WebSocket simulation
        this.isSubmitting = false;
        
        // Initialize chat history for Gemini API
        this.chatHistory = [];
        
        // Rate limiting for API calls
        this.apiRateLimiter = {
            lastRequestTime: 0,
            requestCount: 0,
            resetTime: 0,
            isProcessing: false,
            queue: [],
            minInterval: Config.gemini?.minRequestInterval || 4000, // 4 seconds between requests
            maxPerMinute: Config.gemini?.rateLimitPerMinute || 10
        };
        
        // Schemes data
        this.schemesData = [
            {
                title: "Social Welfare and Security",
                schemes: [
                    { name: "Atal Pension Yojana (APY)", url: "https://npscra.nsdl.co.in/scheme-details.php" },
                    { name: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", url: "https://www.jansuraksha.gov.in/" },
                    { name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)", url: "https://www.jansuraksha.gov.in/" },
                    { name: "National Social Assistance Programme (NSAP)", url: "https://nsap.nic.in/" },
                    { name: "Pradhan Mantri Anusuchit Jaati Abhyudaya Yojana (PM-AJAY)", url: "https://pmay.gov.in/" },
                    { name: "Support for Marginalized Individuals for Livelihood and Enterprise (SMILE)", url: "https://socialjustice.gov.in/schemes/70" },
                ]
            },
            {
                title: "Health and Sanitation",
                schemes: [
                    { name: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)", url: "https://pmjay.gov.in/" },
                    { name: "National Health Mission (NHM)", url: "https://nhm.gov.in/" },
                    { name: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)", url: "http://janaushadhi.gov.in/" },
                    { name: "Swachh Bharat Mission (Gramin)", url: "https://swachhbharatmission.gov.in/sbmcms/index.htm" },
                    { name: "Swachh Bharat Mission (Urban)", url: "https://sbmurban.org/" },
                    { name: "Jal Jeevan Mission", url: "https://jaljeevanmission.gov.in/" },
                ]
            },
            {
                title: "Education and Skill Development",
                schemes: [
                    { name: "Samagra Shiksha Abhiyan", url: "https://samagra.education.gov.in/" },
                    { name: "PM Schools for Rising India (PM SHRI)", url: "https://pmshrischools.education.gov.in/" },
                    { name: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)", url: "https://www.pmkvyofficial.org/" },
                    { name: "National Apprenticeship Promotion Scheme (NAPS)", url: "https://www.apprenticeshipindia.gov.in/" },
                ]
            },
            {
                title: "Rural Development",
                schemes: [
                    { name: "Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)", url: "https://nrega.nic.in/" },
                    { name: "Deendayal Antyodaya Yojana-National Rural Livelihoods Mission (DAY-NRLM)", url: "https://aajeevika.gov.in/" },
                    { name: "Pradhan Mantri Awas Yojana - Gramin (PMAY-G)", url: "https://pmayg.nic.in/" },
                    { name: "Pradhan Mantri Gram Sadak Yojana (PMGSY)", url: "https://omms.nic.in/" },
                    { name: "Saansad Adarsh Gram Yojana (SAGY)", url: "https://saanjhi.gov.in/" },
                    { name: "Mission Amrit Sarovar", url: "https://amritsarovar.gov.in/" },
                ]
            },
            {
                title: "Urban Development",
                schemes: [
                    { name: "Pradhan Mantri Awas Yojana - Urban (PMAY-U)", url: "https://pmay-urban.gov.in/" },
                    { name: "Atal Mission for Rejuvenation and Urban Transformation (AMRUT)", url: "https://amrut.mohua.gov.in/" },
                    { name: "Smart Cities Mission", url: "https://smartcities.gov.in/" },
                ]
            },
            {
                title: "Agriculture and Farmer Welfare",
                schemes: [
                    { name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)", url: "https://pmkisan.gov.in/" },
                    { name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)", url: "https://pmfby.gov.in/" },
                    { name: "Kisan Credit Card (KCC) Scheme", url: "https://www.agricoop.nic.in/en/FarmCredit" },
                    { name: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)", url: "https://pmksy.gov.in/" },
                ]
            },
            {
                title: "Women and Child Development",
                schemes: [
                    { name: "Beti Bachao, Beti Padhao (BBBP)", url: "https://wcd.nic.in/bbbp-schemes" },
                    { name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)", url: "https://wcd.nic.in/schemes/pradhan-mantri-matru-vandana-yojana" },
                    { name: "Saksham Anganwadi and Poshan 2.0", url: "https://www.icds-wcd.nic.in/" },
                    { name: "Mahila Samman Savings Certificate", url: "https://www.indiapost.gov.in/Financial/Pages/Content/Mahila-Samman-Savings-Certificate.aspx" },
                    { name: "One Stop Centre Scheme", url: "https://wcd.nic.in/schemes/one-stop-centre-scheme" },
                ]
            },
            {
                title: "Financial Inclusion and Economic Development",
                schemes: [
                    { name: "Pradhan Mantri Jan Dhan Yojana (PMJDY)", url: "https://pmjdy.gov.in/" },
                    { name: "Pradhan Mantri Mudra Yojana (PMMY)", url: "https://www.mudra.org.in/" },
                    { name: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)", url: "https://pmsvanidhi.mohua.gov.in/" },
                    { name: "Production Linked Incentive (PLI) Scheme", url: "https://www.investindia.gov.in/production-linked-incentive-scheme" },
                    { name: "Atmanirbhar Bharat Abhiyan", url: "https://atmanirbharbharat.mygov.in/" },
                    { name: "PM Vishwakarma Scheme", url: "https://pmvishwakarma.gov.in/" },
                ]
            }
        ];
        
        console.log('AI requests use the server-side proxy');
    }

    /**
     * Gemini requests always go through the server-side proxy.
     */
    getGeminiEndpoint() {
        return '/api/gemini';
    }

    // Convenience getters for auth properties
    get currentUser() {
        return this.auth.getCurrentUser();
    }

    get currentUserRole() {
        return this.auth.getCurrentUserRole();
    }

    async init() {
        const startTime = performance.now();
        
        try {
            loadingManager.showPageLoader('Initializing application...');
            
            // Critical: Initialize database first (with timeout)
            const dbInitPromise = Promise.race([
                this.db.init(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database connection timeout')), 10000)
                )
            ]);
            
            await dbInitPromise;
            
            // Try to restore previous session (sync, fast)
            this.auth.restoreSession();
            
            // Setup UI immediately (sync operations)
            this.setupDarkModeToggle();
            this.setupEventListeners();
            
            // Show appropriate page based on authentication (don't wait for stats)
            if (this.auth.isAuthenticated()) {
                if (this.currentUserRole === 'admin' || this.currentUserRole === 'staff') {
                    this.showPage('adminDashboard');
                } else {
                    this.showPage('landingPage');
                }
                this.updateNavigation();
            } else {
                this.showPage('loginSelectionPage');
            }
            
            this.isInitialized = true;
            
            // Hide loader early - app is usable now
            loadingManager.hidePageLoader();
            
            // Defer non-critical initializations
            requestAnimationFrame(() => {
                this.setupExportButtons();
                this.initializeVoiceInput();
            });
            
            // Load stats and notifications in background (don't block UI)
            setTimeout(() => {
                this.updateStats().catch(console.error);
                this.initializeRealtimeNotifications();
                this.simulateWebSocket();
            }, 100);
            
            const loadTime = (performance.now() - startTime).toFixed(0);
            console.log(`App initialized successfully in ${loadTime}ms`);
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            loadingManager.hidePageLoader();
            
            // Show error but still try to show login page
            this.showPage('loginSelectionPage');
            this.showToast('Some features may be unavailable. Please refresh.', 'error');
        }
    }

    /**
     * Initialize real-time notifications using Supabase
     */
    initializeRealtimeNotifications() {
        if (window.RealtimeNotifications) {
            this.realtimeNotifications = new RealtimeNotifications(this.db.supabase);
            
            // Request permission for browser notifications
            this.realtimeNotifications.requestPermission();
            
            // Subscribe to report changes if authenticated
            if (this.auth.isAuthenticated()) {
                this.realtimeNotifications.subscribeToReports((notification) => {
                    // Handle report changes
                    console.log('Real-time notification:', notification);
                    
                    // Refresh data if on admin dashboard
                    if (this.currentPage === 'adminDashboard') {
                        this.updateAdminDashboard();
                    }
                });
            }
        }
    }

    /**
     * Initialize voice input for report forms
     */
    initializeVoiceInput() {
        if (window.voiceInputManager && voiceInputManager.isSupported()) {
            // Show voice buttons
            const voiceButtons = document.querySelectorAll('[data-voice-for]');
            voiceButtons.forEach(btn => {
                btn.style.display = 'inline-block';
                const fieldId = btn.getAttribute('data-voice-for');
                const statusId = `${fieldId}VoiceStatus`;
                btn.onclick = () => voiceInputManager.startListening(fieldId, statusId);
            });
        }
    }

    /**
     * Setup dark mode toggle
     */
    setupDarkModeToggle() {
        const toggleBtn = document.getElementById('darkModeToggle');
        if (toggleBtn && window.darkModeManager) {
            toggleBtn.onclick = () => darkModeManager.toggle();
            darkModeManager.updateToggleButton();
        }
    }

    /**
     * Setup export buttons
     */
    setupExportButtons() {
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        
        if (exportPdfBtn && window.exportManager) {
            exportPdfBtn.style.display = 'inline-block';
            exportPdfBtn.onclick = () => this.handleExportPDF();
        }
        
        if (exportExcelBtn && window.exportManager) {
            exportExcelBtn.style.display = 'inline-block';
            exportExcelBtn.onclick = () => this.handleExportExcel();
        }
    }

    /**
     * Handle PDF export
     */
    async handleExportPDF() {
        try {
            const reports = await this.db.getReportsWithDetails();
            await exportManager.exportToPDF(reports);
            this.showToast('Reports exported to PDF successfully', 'success');
        } catch (error) {
            console.error('PDF export failed:', error);
            this.showToast('Failed to export to PDF', 'error');
        }
    }

    /**
     * Handle Excel export
     */
    async handleExportExcel() {
        try {
            const reports = await this.db.getReportsWithDetails();
            await exportManager.exportToExcel(reports);
            this.showToast('Reports exported to Excel successfully', 'success');
        } catch (error) {
            console.error('Excel export failed:', error);
            this.showToast('Failed to export to Excel', 'error');
        }
    }

    simulateWebSocket() {
        // Simulate real-time WebSocket connection
        this.wsConnection = {
            connected: true,
            send: (data) => {
                console.log('WebSocket send:', data);
                // Simulate real-time notifications
                if (data.type === 'report_submitted') {
                    setTimeout(() => {
                        this.showToast('New report received by department', 'success');
                    }, 1000);
                }
            },
            onMessage: (callback) => {
                // Simulate incoming messages
                setInterval(() => {
                    if (this.currentUser && Math.random() > 0.95) {
                        callback({
                            type: 'status_update',
                            message: 'Report status updated'
                        });
                    }
                }, 10000);
            }
        };
    }

    setupEventListeners() {
        // Report form
        document.getElementById('reportIssueBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('reportForm');
            // Load categories when showing the form - this fixes the bug
            setTimeout(() => this.loadCategories(), 100);
        });
        
        document.getElementById('cancelReportBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('landingPage');
        });
        
        document.getElementById('issueForm')?.addEventListener('submit', (e) => this.handleReportSubmit(e));
        
        // Photo upload
        document.getElementById('takePhotoBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('photoInput')?.click();
        });
        
        document.getElementById('photoInput')?.addEventListener('change', (e) => this.handlePhotoUpload(e));
        
        // AI Image Analysis button
        document.getElementById('analyzePhotoBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.analyzeUploadedImage();
        });
        
        // Inside setupEventListeners() of CivicReportApp class:
        document.getElementById('addDepartmentBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAddDepartmentModal();
        });

        document.getElementById('addCategoryBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAddCategoryModal();
        });
        // Category change to load subcategories
        document.getElementById('category')?.addEventListener('change', (e) => {
            this.loadSubcategories(e.target.value);
        });

        // Location
        document.getElementById('getLocationBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.getCurrentLocation();
        });
        
        // Admin Login and Logout
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleAdminLogin(e));
        // Note: The main logout button listener is in setupNavigationListeners
        
        // Admin dashboard logout button (separate from nav logout)
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Admin tabs
        document.getElementById('dashboardTab')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminTab('dashboard');
        });
        document.getElementById('reportsTab')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminTab('reports');
        });
        document.getElementById('analyticsTab')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminTab('analytics');
        });
        document.getElementById('usersTab')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminTab('users');
        });
        document.getElementById('settingsTab')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminTab('settings');
        });
        
        // Track reports
        document.getElementById('loadReportsBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadUserReports();
        });
        
        // Modal
        document.getElementById('closeModal')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal();
        });
        document.getElementById('closeModalBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal();
        });
        
        // User modal
        document.getElementById('addUserBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showUserModal();
        });
        document.getElementById('closeUserModal')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideUserModal();
        });
        document.getElementById('saveUserBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveUser();
        });
        document.getElementById('cancelUserBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideUserModal();
        });
        
        // Database actions
        document.getElementById('backupDbBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.backupDatabase();
        });
        document.getElementById('clearDataBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearDatabase();
        });
        
        // Toast
        document.getElementById('closeToast')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideToast();
        });
        // Citizen auth
        document.getElementById('citizenLoginForm')?.addEventListener('submit', (e) => this.handleCitizenLogin(e));
        document.getElementById('citizenRegisterForm')?.addEventListener('submit', (e) => this.handleCitizenRegister(e));

        // Staff login
        document.getElementById('staffLoginForm')?.addEventListener('submit', (e) => this.handleStaffLogin(e));

        // --- SETUP CHATBOT ---
        // This only needs to be called once when the app initializes.
        this.setupChatbotListeners();
    }

    /**
     * @description Sets up event listeners for the dynamic navigation bar.
     * This should be called *after* the navigation bar's innerHTML is updated.
     */
    setupNavigationListeners() {
        document.getElementById('homeBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('landingPage');
        });
        document.getElementById('mapBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('mapPage');
        });
        document.getElementById('trackBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('trackPage');
        });
        document.getElementById('schemesBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('schemesPage');
        });

        document.getElementById('adminBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            // Go to dashboard if already logged in as staff/admin, otherwise show login
            if (this.currentUser && (this.currentUserRole === 'admin' || this.currentUserRole === 'staff')) {
                this.showPage('adminDashboard');
            } else {
                this.showPage('adminLogin');
            }
        });
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    }

    /**
     * @description Sets up event listeners for the chatbot.
     * This is called once during app initialization.
     */
    setupChatbotListeners() {
        const chatbotToggler = document.querySelector(".chatbot-toggler");
        const chatInput = document.querySelector(".chat-input textarea");
        const sendChatBtn = document.querySelector(".chat-input button");

        if (chatbotToggler && chatInput && sendChatBtn) {
            chatbotToggler.addEventListener("click", () => {
                document.querySelector(".chatbot").classList.toggle("chat-open");
                chatbotToggler.classList.toggle("chat-open");
            });

            sendChatBtn.addEventListener("click", () => this.handleChatMessage());
            chatInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.handleChatMessage();
                }
            });
        } else {
            console.warn("Chatbot elements not found. Listeners not attached.");
        }
    }
    
    // --- START: CHATBOT METHODS ---

    async handleChatMessage() {
        const chatInput = document.querySelector(".chat-input textarea");
        const chatbox = document.querySelector(".chatbox");
        const sendBtn = document.querySelector(".chat-input button");
        
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;
        
        console.log('Chat: Processing message:', userMessage);
        
        // Prevent double-clicking while processing
        if (this.apiRateLimiter.isProcessing) {
            this.showToast('Please wait for the current response...', 'info');
            return;
        }
        
        // Disable send button during processing
        if (sendBtn) sendBtn.disabled = true;

        chatInput.value = "";
        
        // Display user message
        const userMessageLi = this.createChatLi(userMessage, "outgoing");
        chatbox.appendChild(userMessageLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        
        // Add to history
        this.chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        console.log('Chat: History updated, length:', this.chatHistory.length);

        // Show typing indicator
        const typingLi = this.createChatLi("...", "incoming", true);
        chatbox.appendChild(typingLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        
        try {
            console.log('Chat: Calling Gemini API...');
            const responseText = await this.getGeminiResponse(userMessage);
            console.log('Chat: Got response:', responseText?.substring(0, 100));

            // Add AI response to history
            this.chatHistory.push({ role: "model", parts: [{ text: responseText }] });
            
            // Display AI response
            typingLi.querySelector("p").innerHTML = this.formatResponse(responseText);

        } catch (error) {
            console.error("Gemini Error:", error);
            let errorText = "Oops! Something went wrong. Please try again later.";
            
            // Provide more specific error messages
            if (error.message.includes('Rate limit')) {
                errorText = "⏳ Too many requests. Please wait a moment before trying again.";
            } else if (error.message.includes('wait for the current')) {
                errorText = "⏳ Please wait for the current request to finish.";
            }
            
            // Create a paragraph element for the error message
            const p = document.createElement('p');
            p.textContent = errorText;
            p.style.color = '#ff6b6b';
            // Replace the typing indicator with the error paragraph
            typingLi.innerHTML = '';
            typingLi.appendChild(p);
        } finally {
            // Re-enable send button
            const sendBtn = document.querySelector(".chat-input button");
            if (sendBtn) sendBtn.disabled = false;
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }
    }

    createChatLi(message, className, isTyping = false) {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent;
        if (isTyping) {
            // Use span instead of div inside p (div cannot be inside p)
            chatContent = `<p class="typing-container"><span class="typing-indicator">
                    <span></span><span></span><span></span>
                </span></p>`;
        } else {
            chatContent = `<p>${message}</p>`;
        }
        chatLi.innerHTML = chatContent;
        return chatLi;
    }

    formatResponse(text) {
        // Simple sanitization
        let sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return sanitizedText.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }

    /**
     * Rate limiter - ensures we don't exceed API limits
     * Waits if needed before allowing the next request
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.apiRateLimiter.lastRequestTime;
        
        // Reset counter every minute
        if (now > this.apiRateLimiter.resetTime) {
            this.apiRateLimiter.requestCount = 0;
            this.apiRateLimiter.resetTime = now + 60000;
        }
        
        // Check if we've hit the rate limit
        if (this.apiRateLimiter.requestCount >= this.apiRateLimiter.maxPerMinute) {
            const waitTime = this.apiRateLimiter.resetTime - now;
            console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
            this.apiRateLimiter.requestCount = 0;
            this.apiRateLimiter.resetTime = Date.now() + 60000;
        }
        
        // Ensure minimum interval between requests
        if (timeSinceLastRequest < this.apiRateLimiter.minInterval) {
            const waitTime = this.apiRateLimiter.minInterval - timeSinceLastRequest;
            console.log(`Waiting ${waitTime}ms before next API call...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.apiRateLimiter.lastRequestTime = Date.now();
        this.apiRateLimiter.requestCount++;
    }

    async getGeminiResponse(prompt) {
        // Prevent duplicate simultaneous requests
        if (this.apiRateLimiter.isProcessing) {
            throw new Error("Please wait for the current request to complete.");
        }
        
        this.apiRateLimiter.isProcessing = true;
        
        try {
            // Wait for rate limit
            await this.waitForRateLimit();

            const API_URL = this.getGeminiEndpoint();
            console.log('AI Request: Using server-side proxy');

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const requestBody = {
                action: 'chat',
                contents: this.chatHistory
            };

            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: controller.signal,
                body: JSON.stringify(requestBody),
            };

            const res = await fetch(API_URL, requestOptions);
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                
                // Handle rate limit error specifically
                if (res.status === 429) {
                    // Wait longer on rate limit and reset counter
                    this.apiRateLimiter.requestCount = this.apiRateLimiter.maxPerMinute;
                    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
                }
                
                throw new Error(`API Error: ${res.status} - ${errorBody?.error?.message || res.statusText}`);
            }
            
            const data = await res.json();
            // Check if candidates exist
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("No response generated. This may be due to safety filters.");
            }
            console.log('AI Response received successfully');
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw error;
        } finally {
            this.apiRateLimiter.isProcessing = false;
        }
    }
    
    // --- END: CHATBOT METHODS ---

    showLoginType(type) {
        if (type === 'citizen') {
            this.showPage('citizenAuthPage');
        } else if (type === 'staff') {
            this.showPage('staffLoginPage');
        } else if (type === 'admin') {
            this.showPage('adminLogin');
        }
    }

    showAuthTab(tab) {
        const loginTab = document.getElementById('citizenLoginTab');
        const registerTab = document.getElementById('citizenRegisterTab');
        const loginForm = document.getElementById('citizenLoginForm');
        const registerForm = document.getElementById('citizenRegisterForm');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
    }

    updateNavigation() {
        const navLinks = document.getElementById('navLinks');
        const navbar = document.getElementById('mainNavbar');
        
        if (!this.currentUser) {
            navbar.style.display = 'none';
            return;
        }
        
        // Don't show navbar if we're on admin dashboard (it has its own header)
        if (this.currentPage === 'adminDashboard') {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'block';
        }
        
        if (this.currentUserRole === 'citizen') {
            navLinks.innerHTML = `
                <button id="homeBtn" class="nav-link active">Home</button>
                <button id="mapBtn" class="nav-link">Map</button>
                <button id="trackBtn" class="nav-link">Track Reports</button>
                <button id="schemesBtn" class="nav-link">Govt Schemes</button>
                <button id="logoutBtn" class="nav-link">Logout</button>
            `;
        } else if (this.currentUserRole === 'staff') {
            navLinks.innerHTML = `
                <button id="homeBtn" class="nav-link active">Home</button>
                <button id="mapBtn" class="nav-link">Map</button>
                <button id="trackBtn" class="nav-link">Track Reports</button>
                <button id="adminBtn" class="nav-link">Staff Dashboard</button>
                <button id="logoutBtn" class="nav-link">Logout</button>
            `;
        } else if (this.currentUserRole === 'admin') {
            navLinks.innerHTML = `
                <button id="homeBtn" class="nav-link active">Home</button>
                <button id="mapBtn" class="nav-link">Map</button>
                <button id="trackBtn" class="nav-link">Track Reports</button>
                <button id="adminBtn" class="nav-link">Admin</button>
                <button id="logoutBtn" class="nav-link">Logout</button>
            `;
        }
        
        // Re-attach event listeners for the newly created navigation buttons
        this.setupNavigationListeners();
    }

    async handleCitizenRegister(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Clear previous errors
        ['Name', 'Email', 'Password', 'Confirm'].forEach(field => {
            Validator.clearFieldError(`citizenRegister${field}`);
        });
        
        const formData = {
            name: document.getElementById('citizenRegisterName').value.trim(),
            email: document.getElementById('citizenRegisterEmail').value.trim(),
            password: document.getElementById('citizenRegisterPassword').value.trim(),
            confirmPassword: document.getElementById('citizenRegisterConfirm').value.trim()
        };
        
        try {
            loadingManager.setButtonLoading(submitBtn.id || 'registerSubmit', 'Creating account...');
            
            await this.auth.registerCitizen(formData);
            
            this.showToast('Registration successful! Please login', 'success');
            this.showAuthTab('login');
            document.getElementById('citizenRegisterForm').reset();
        } catch (error) {
            console.error('Registration failed:', error);
            this.showToast(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                submitBtn.classList.remove('btn-loading');
            }
        }
    }

    async handleCitizenLogin(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        // Clear previous errors
        Validator.clearFieldError('citizenLoginEmail');
        Validator.clearFieldError('citizenLoginPassword');
        
        const email = document.getElementById('citizenLoginEmail').value.trim();
        const password = document.getElementById('citizenLoginPassword').value.trim();
        
        try {
            loadingManager.setButtonLoading(submitBtn.id || 'loginSubmit', 'Logging in...');
            
            const result = await this.auth.loginCitizen(email, password);
            
            this.updateNavigation();
            this.showPage('landingPage');
            this.showToast(`Welcome back, ${result.user.name}!`, 'success');
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            loadingManager.resetButton(submitBtn.id || 'loginSubmit');
        }
    }

    async handleStaffLogin(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const email = document.getElementById('staffEmail').value.trim();
        const password = document.getElementById('staffPassword').value.trim();
        
        try {
            loadingManager.setButtonLoading(submitBtn.id || 'staffLoginSubmit', 'Logging in...');
            
            const result = await this.auth.loginStaff(email, password);
            
            this.updateNavigation();
            this.showPage('adminDashboard');
            document.getElementById('currentUserInfo').textContent = 
                `Welcome, ${result.user.name} (Staff - ${result.user.department})`;
            this.showToast(`Welcome, ${result.user.name}!`, 'success');
            this.auth.applyRoleBasedPermissions();
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            loadingManager.resetButton(submitBtn.id || 'staffLoginSubmit');
        }
    }
    showPage(pageId) {
        console.log('Showing page:', pageId);
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Handle navbar visibility - hide for admin dashboard (it has its own header)
        const navbar = document.getElementById('mainNavbar');
        if (pageId === 'adminDashboard') {
            navbar.style.display = 'none';
        } else if (this.currentUser) {
            navbar.style.display = 'block';
        } else {
            navbar.style.display = 'none';
        }
        
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        } else {
            console.error('Page not found:', pageId);
            return;
        }
        
        // Update nav active state
        const navMap = {
            'landingPage': 'homeBtn',
            'mapPage': 'mapBtn',
            'trackPage': 'trackBtn',
            'schemesPage': 'schemesBtn',
            'adminLogin': 'adminBtn',
            'adminDashboard': 'adminBtn'
        };
        
        if (navMap[pageId]) {
            const navBtn = document.getElementById(navMap[pageId]);
            if (navBtn) navBtn.classList.add('active');
        }
        
        // Handle page-specific logic
        if (pageId === 'mapPage') {
            setTimeout(() => this.initMap(), 100);
        } else if (pageId === 'adminDashboard') {
            setTimeout(() => this.updateAdminDashboard(), 100);
        }else if (pageId === 'schemesPage') {
            this.loadSchemes();
        }
    }

    async loadCategories() {
        try {
            console.log('Loading categories...');
            const categories = await this.db.select('categories');
            console.log('Categories loaded:', categories);
            
            const categorySelect = document.getElementById('category');
            const mapCategoryFilter = document.getElementById('mapCategoryFilter');
            const adminCategoryFilter = document.getElementById('adminCategoryFilter');
            
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">Select category...</option>';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
                console.log('Category select populated with', categories.length, 'categories');
            }
            
            if (mapCategoryFilter) {
                mapCategoryFilter.innerHTML = '<option value="">All Categories</option>';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = cat.name;
                    mapCategoryFilter.appendChild(option);
                });
            }
            
            if (adminCategoryFilter) {
                adminCategoryFilter.innerHTML = '<option value="">All Categories</option>';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = cat.name;
                    adminCategoryFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.showToast('Failed to load categories', 'error');
        }
    }
    async loadSubcategories(categoryName) {
        try {
            const subcategoryGroup = document.getElementById('subcategoryGroup');
            const subcategorySelect = document.getElementById('subcategory');
            
            if (!categoryName) {
                subcategoryGroup.style.display = 'none';
                subcategorySelect.required = false;
                return;
            }
            
            const subcategories = await this.db.select('subcategories', { category_name: categoryName });
            
            if (subcategories.length > 0) {
                subcategoryGroup.style.display = 'block';
                subcategorySelect.required = true;
                subcategorySelect.innerHTML = '<option value="">Select specific issue...</option>';
                
                subcategories.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.subcategory_name;
                    option.textContent = sub.subcategory_name;
                    if (sub.description) {
                        option.title = sub.description;
                    }
                    subcategorySelect.appendChild(option);
                });
            } else {
                subcategoryGroup.style.display = 'none';
                subcategorySelect.required = false;
            }
        } catch (error) {
            console.error('Failed to load subcategories:', error);
        }
    }
    async deleteReport(id) {
        if (this.currentUserRole !== 'admin') {
            return this.showToast('Only admins can delete reports', 'error');
        }
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }
        try {
            await this.db.delete('reports', { id });
            this.showToast('Report deleted successfully', 'success');
            this.hideModal();
            this.loadReportsManagement();
            this.updateAdminDashboard();
        } catch (error) {
            console.error('Delete failed:', error);
            this.showToast('Failed to delete report', 'error');
        }
    }

    async deleteUser(id) {
        if (this.currentUserRole !== 'admin') {
            return this.showToast('Only admins can delete users', 'error');
        }
        if (id === this.currentUser.id) {
            return this.showToast('Cannot delete your own account', 'error');
        }
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }
        try {
            await this.db.delete('users', { id });
            this.showToast('User deleted successfully', 'success');
            this.loadUsersManagement();
        } catch (error) {
            console.error('Delete failed:', error);
            this.showToast('Failed to delete user', 'error');
        }
    }

    async handleReportSubmit(e) {
        e.preventDefault();
        
        // Prevent duplicate submissions
        if (this.isSubmitting) {
            return;
        }
        
        const submitBtn = document.getElementById('submitReportBtn');
        
        // Clear previous validation errors
        ['title', 'description', 'category', 'priority'].forEach(field => {
            Validator.clearFieldError(field);
        });
        
        // Gather form data
        const photoFile = document.getElementById('photoInput').files[0];
        
        const formData = {
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            category: document.getElementById('category').value,
            subcategory: document.getElementById('subcategory')?.value || null,
            priority: document.getElementById('priority').value,
            photo: photoFile
        };
        
        // Validate form
        const validation = Validator.validateReportForm(formData);
        if (!validation.valid) {
            validation.errors.forEach(error => {
                Validator.showFieldError(error.field, error.message);
            });
            this.showToast(validation.errors[0].message, 'error');
            return;
        }
        
        this.isSubmitting = true;
        
        try {
            loadingManager.setButtonLoading('submitReportBtn', 'Submitting report...');
            
            // Compress and convert photo if exists
            let photoPath = null;
            if (photoFile) {
                const compressed = await Utils.compressImage(photoFile, 1200, Config.upload.compressionQuality);
                photoPath = await this.convertToBase64(compressed);
            }
            
            const report = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                subcategory: formData.subcategory,
                priority: formData.priority,
                citizen_contact: document.getElementById('contactEmail').value.trim(),
                latitude: this.currentLocation?.lat || null,
                longitude: this.currentLocation?.lng || null,
                address: this.currentLocation?.address || document.getElementById('manualAddress').value.trim(),
                photo_path: photoPath,
                internal_notes: ''
            };

            // Auto-assign department based on category
            try {
                const categories = await this.db.select('categories');
                const category = categories.find(c => c.name === report.category);
                if (category) {
                    report.assigned_department = category.department_mapping;
                }
            } catch (error) {
                console.error('Failed to assign department:', error);
            }

            // Submit the report
            const reportId = await this.db.insert('reports', report);
            this.showToast(`Report #${reportId.id || reportId} submitted successfully! Department has been notified.`, 'success');
            this.resetReportForm();
            this.showPage('landingPage');
            await this.updateStats();

            // Simulate WebSocket notification
            if (this.wsConnection) {
                this.wsConnection.send({
                    type: 'report_submitted',
                    reportId: reportId.id || reportId,
                    department: report.assigned_department
                });
            }
            
        } catch (error) {
            console.error('Failed to submit report:', error);
            this.showToast('Failed to submit report. Please try again.', 'error');
        } finally {
            this.isSubmitting = false;
            loadingManager.resetButton('submitReportBtn');
        }
    }

    async handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file
            const validation = Validator.validateFile(file);
            if (!validation.valid) {
                this.showToast(validation.message, 'error');
                e.target.value = ''; // Clear the input
                return;
            }
            
            const preview = document.getElementById('photoPreview');
            const analyzeBtn = document.getElementById('analyzePhotoBtn');
            const analyzeStatus = document.getElementById('analyzeStatus');
            const reader = new FileReader();
            
            loadingManager.showInline('photoPreview', 'small');
            
            reader.onload = (e) => {
                loadingManager.hideInline('photoPreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview">`;
                preview.classList.remove('hidden');
                
                // Show the analyze button
                if (analyzeBtn) {
                    analyzeBtn.style.display = 'inline-flex';
                }
                
                // Hide any previous status
                if (analyzeStatus) {
                    analyzeStatus.className = 'analyze-status';
                    analyzeStatus.innerHTML = '';
                }
            };
            
            reader.onerror = () => {
                loadingManager.hideInline('photoPreview');
                this.showToast('Failed to load image', 'error');
            };
            
            reader.readAsDataURL(file);
        }
    }

    /**
     * Analyze uploaded image using Gemini Vision API
     * Auto-fills title, description, and suggests category
     */
    async analyzeUploadedImage() {
        const photoInput = document.getElementById('photoInput');
        const analyzeBtn = document.getElementById('analyzePhotoBtn');
        const analyzeStatus = document.getElementById('analyzeStatus');
        
        if (!photoInput?.files[0]) {
            this.showToast('Please upload an image first', 'error');
            return;
        }
        
        const file = photoInput.files[0];
        
        // Show analyzing status
        analyzeStatus.className = 'analyze-status analyzing';
        analyzeStatus.innerHTML = '<div class="analyze-spinner"></div><span>Analyzing image with AI...</span>';
        analyzeBtn.disabled = true;
        
        try {
            // Convert image to base64
            const base64Data = await this.convertToBase64(file);
            // Remove the data URL prefix to get just the base64 content
            const base64Content = base64Data.split(',')[1];
            
            // Call Gemini Vision API
            const analysis = await this.analyzeImageWithGemini(base64Content, file.type);
            
            // Auto-fill the form fields
            this.applyImageAnalysis(analysis);
            
            // Show success status
            analyzeStatus.className = 'analyze-status success';
            analyzeStatus.innerHTML = '✅ Image analyzed! Title and description have been auto-filled. Please review and edit if needed.';
            
            this.showToast('Image analyzed successfully! Form fields updated.', 'success');
            
        } catch (error) {
            console.error('Image analysis failed:', error);
            analyzeStatus.className = 'analyze-status error';
            analyzeStatus.innerHTML = `❌ Analysis failed: ${error.message}`;
            this.showToast('Failed to analyze image. Please fill in manually.', 'error');
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    /**
     * Call Gemini Vision API to analyze the image
     */
    async analyzeImageWithGemini(base64Image, mimeType) {
        // Prevent duplicate simultaneous requests
        if (this.apiRateLimiter.isProcessing) {
            throw new Error("Please wait for the current request to complete.");
        }
        
        this.apiRateLimiter.isProcessing = true;

        const API_URL = this.getGeminiEndpoint();
        
        console.log('Image Analysis: Using server-side proxy');

        const prompt = `You are an AI assistant for a civic issue reporting system in rural India. 
Analyze this image and identify any civic/infrastructure issues visible.

Provide your response in this exact JSON format:
{
    "title": "A clear, concise title for the issue (10-50 characters)",
    "description": "A detailed description of the issue visible in the image, including what's wrong, potential impact, and any relevant observations (50-200 characters)",
    "suggestedCategory": "One of: Education, Healthcare, Drinking Water, Sanitation, Electricity, Roads & Connectivity, Skill Development, Agriculture & Livelihood, Housing, Social Welfare",
    "suggestedPriority": "One of: Low, Medium, High, Emergency",
    "confidence": "Your confidence level: high, medium, or low"
}

If the image doesn't show a clear civic issue, still provide your best interpretation of what might need attention.
Respond ONLY with the JSON, no additional text.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
            // Wait for rate limit
            await this.waitForRateLimit();
            
            const requestBody = {
                action: 'analyze-image',
                contents: [{ parts: [{ text: prompt }] }],
                imageData: base64Image,
                mimeType: mimeType || 'image/jpeg'
            };
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify(requestBody)
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Handle rate limit error specifically
                if (response.status === 429) {
                    this.apiRateLimiter.requestCount = this.apiRateLimiter.maxPerMinute;
                    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
                }
                
                throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No analysis generated');
            }

            const textResponse = data.candidates[0].content.parts[0].text;
            
            // Parse JSON from response (handle potential markdown code blocks)
            let jsonStr = textResponse.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.slice(7);
            }
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.slice(3);
            }
            if (jsonStr.endsWith('```')) {
                jsonStr = jsonStr.slice(0, -3);
            }
            
            return JSON.parse(jsonStr.trim());

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Analysis timed out. Please try again.');
            }
            
            throw error;
        } finally {
            this.apiRateLimiter.isProcessing = false;
        }
    }

    /**
     * Apply image analysis results to form fields
     */
    applyImageAnalysis(analysis) {
        const titleField = document.getElementById('title');
        const descriptionField = document.getElementById('description');
        const categoryField = document.getElementById('category');
        const priorityField = document.getElementById('priority');

        // Fill title
        if (analysis.title && titleField) {
            titleField.value = analysis.title;
            titleField.classList.add('ai-filled');
            this.addAiBadge(titleField);
        }

        // Fill description
        if (analysis.description && descriptionField) {
            descriptionField.value = analysis.description;
            descriptionField.classList.add('ai-filled');
            this.addAiBadge(descriptionField);
        }

        // Suggest category
        if (analysis.suggestedCategory && categoryField) {
            const options = Array.from(categoryField.options);
            const match = options.find(opt => 
                opt.value.toLowerCase() === analysis.suggestedCategory.toLowerCase() ||
                opt.text.toLowerCase().includes(analysis.suggestedCategory.toLowerCase())
            );
            if (match) {
                categoryField.value = match.value;
                categoryField.classList.add('ai-filled');
                // Trigger subcategory load
                this.loadSubcategories(match.value);
            }
        }

        // Suggest priority
        if (analysis.suggestedPriority && priorityField) {
            const options = Array.from(priorityField.options);
            const match = options.find(opt => 
                opt.value.toLowerCase() === analysis.suggestedPriority.toLowerCase()
            );
            if (match) {
                priorityField.value = match.value;
                priorityField.classList.add('ai-filled');
            }
        }

        // Scroll to title field so user can review
        titleField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Add AI suggestion badge to a field's label
     */
    addAiBadge(field) {
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            const label = formGroup.querySelector('.form-label');
            if (label && !label.querySelector('.ai-suggestion-badge')) {
                const badge = document.createElement('span');
                badge.className = 'ai-suggestion-badge';
                badge.textContent = 'AI Suggested';
                label.appendChild(badge);
            }
        }
    }

    async convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Store raw coordinates with full precision
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    this.currentLocation = {
                        lat: lat,
                        lng: lng,
                        // 12 decimal points precision for display
                        address: `${lat.toFixed(12)}, ${lng.toFixed(12)}`,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    const locationDisplay = document.getElementById('locationDisplay');
                    if (locationDisplay) {
                        locationDisplay.innerHTML = `📍 Location: ${this.currentLocation.address}<br><small>Accuracy: ±${this.currentLocation.accuracy?.toFixed(1) || 'N/A'}m</small>`;
                        locationDisplay.classList.add('active');
                    }
                    this.showToast('Location captured with high precision!', 'success');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    
                    let errorMessage = 'Failed to get location. ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied. Please enable location services and refresh the page.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable. Check your internet connection.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMessage = 'Unknown location error occurred.';
                            break;
                    }
                    this.showToast(errorMessage, 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0 // Always get fresh location
                }
            );
        } else {
            this.showToast('Geolocation is not supported by this browser.', 'error');
        }
    }


    async handleAdminLogin(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        
        try {
            loadingManager.setButtonLoading(submitBtn.id || 'adminLoginSubmit', 'Logging in...');
            
            const result = await this.auth.loginAdmin(email, password);
            
            document.getElementById('currentUserInfo').textContent =
                `Welcome, ${result.user.name} (${result.user.role})`;
            this.showPage('adminDashboard');
            this.showToast(`Login successful! Welcome, ${result.user.name}`, 'success');
            this.auth.applyRoleBasedPermissions();
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            loadingManager.resetButton(submitBtn.id || 'adminLoginSubmit');
        }
    }
    
    applyRoleBasedPermissions() {
        this.auth.applyRoleBasedPermissions();
    }

    handleLogout() {
        this.auth.logout();
        const currentUserInfo = document.getElementById('currentUserInfo');
        if (currentUserInfo) {
            currentUserInfo.textContent = 'Welcome, Admin';
        }
        this.showPage('loginSelectionPage');
        this.showToast('Logged out successfully', 'success');
    }

    async updateStats() {
        try {
            const stats = await this.db.getReportStatistics();
            
            // Calculate average resolution time (mock calculation based on resolved reports)
            const avgResolutionTime = stats.resolved > 0 ? Math.floor(Math.random() * 3) + 2 : 0;
            
            const elements = {
                totalReports: document.getElementById('totalReports'),
                resolvedReports: document.getElementById('resolvedReports'),
                avgResolutionTime: document.getElementById('avgResolutionTime'),
                pendingReports: document.getElementById('pendingReports')
            };
            
            if (elements.totalReports) elements.totalReports.textContent = stats.total;
            if (elements.resolvedReports) elements.resolvedReports.textContent = stats.resolved;
            if (elements.avgResolutionTime) elements.avgResolutionTime.textContent = avgResolutionTime;
            if (elements.pendingReports) elements.pendingReports.textContent = stats.pending;
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    async initMap() {
        if (this.map) {
            this.map.remove();
        }
        
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;
        
        this.map = L.map('mapContainer').setView([20.5937, 78.9629], 5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        await this.loadMapReports();
        this.setupMapFilters();
        this.setupMapLegend();
    }

    async loadMapReports() {
        try {
            const reports = await this.db.select('reports');
            const categoryColors = {
                'Education': '#FF6B6B',
                'Healthcare': '#4ECDC4',
                'Drinking Water': '#45B7D1',
                'Sanitation': '#96CEB4',
                'Electricity': '#FFEAA7',
                'Roads & Connectivity': '#DFE6E9',
                'Skill Development': '#A29BFE',
                'Agriculture & Livelihood': '#6C5CE7',
                'Housing': '#FD79A8',
                'Social Welfare': '#FDCB6E'
            };
            
            reports.forEach(report => {
                if (report.latitude && report.longitude && this.map) {
                    const marker = L.circleMarker([report.latitude, report.longitude], {
                        radius: this.getPriorityRadius(report.priority),
                        fillColor: categoryColors[report.category] || '#964325',
                        color: this.getStatusColor(report.status),
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(this.map);
                    marker.on('click', function(e) {
                        this.map.setView([report.latitude, report.longitude], 16, {
                            animate: true,
                            duration: 1.0
                        });
                    }.bind(this));
                    marker.bindPopup(`
                        <div class="map-popup">
                            <h4>${report.title}</h4>
                            <p><strong>Category:</strong> ${report.category}</p>
                            <p><strong>Priority:</strong> ${report.priority}</p>
                            <p><strong>Status:</strong> ${report.status}</p>
                            <p><strong>Department:</strong> ${report.assigned_department}</p>
                            <p><strong>Description:</strong> ${report.description}</p>
                            <p><strong>Reported:</strong> ${new Date(report.created_at).toLocaleDateString()}</p>
                            ${report.address ? `<p><strong>Address:</strong> ${report.address}</p>` : ''}
                        </div>
                    `);
                }
            });
        } catch (error) {
            console.error('Failed to load map reports:', error);
        }
    }

    getPriorityRadius(priority) {
        switch(priority) {
            case 'Emergency': return 12;
            case 'High': return 10;
            case 'Medium': return 8;
            case 'Low': return 6;
            default: return 8;
        }
    }

    getStatusColor(status) {
        switch(status) {
            case 'Pending': return '#FFC185';
            case 'In Progress': return '#1FB8CD';
            case 'Resolved': return '#5D878F';
            default: return '#964325';
        }
    }

    setupMapFilters() {
        this.loadCategories();
        
        const categoryFilter = document.getElementById('mapCategoryFilter');
        const statusFilter = document.getElementById('mapStatusFilter');
        const priorityFilter = document.getElementById('mapPriorityFilter');
        
        [categoryFilter, statusFilter, priorityFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.filterMapReports());
            }
        });
    }

    async filterMapReports() {
        // Clear existing markers
        this.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker) {
                this.map.removeLayer(layer);
            }
        });
        
        // Get filter values
        const categoryFilter = document.getElementById('mapCategoryFilter')?.value;
        const statusFilter = document.getElementById('mapStatusFilter')?.value;
        const priorityFilter = document.getElementById('mapPriorityFilter')?.value;
        
        // Build where clause
        const where = {};
        if (categoryFilter) where.category = categoryFilter;
        if (statusFilter) where.status = statusFilter;
        if (priorityFilter) where.priority = priorityFilter;
        
        try {
            const filteredReports = await this.db.select('reports', Object.keys(where).length ? where : null);
            
            const categoryColors = {
                'Potholes': '#1FB8CD',
                'Street Lights': '#FFC185',
                'Trash Collection': '#B4413C',
                'Water Issues': '#ECEBD5',
                'Traffic Signs': '#5D878F',
                'Graffiti': '#DB4545',
                'Parks & Recreation': '#D2BA4C',
                'Other': '#964325'
            };
            
            filteredReports.forEach(report => {
                if (report.latitude && report.longitude) {
                    const marker = L.circleMarker([report.latitude, report.longitude], {
                        radius: this.getPriorityRadius(report.priority),
                        fillColor: categoryColors[report.category] || '#964325',
                        color: this.getStatusColor(report.status),
                        weight: 2,
                        opacity: 1, 
                        fillOpacity: 0.8
                    }).addTo(this.map);
                    
                    marker.bindPopup(`
                        <div class="map-popup">
                            <h4>${report.title}</h4>
                            <p><strong>Category:</strong> ${report.category}</p>
                            ${report.subcategory ? `<p><strong>Issue:</strong> ${report.subcategory}</p>` : ''}
                            <p><strong>Priority:</strong> ${report.priority}</p>
                            <p><strong>Status:</strong> ${report.status}</p>
                            <p><strong>Department:</strong> ${report.assigned_department}</p>
                            <p><strong>Description:</strong> ${report.description}</p>
                            <p><strong>Reported:</strong> ${new Date(report.created_at).toLocaleDateString()}</p>
                            ${report.address ? `<p><strong>Location:</strong> ${report.address}</p>` : ''}
                        </div>
                    `);
                }
            });
        } catch (error) {
            console.error('Failed to filter map reports:', error);
        }
    }

    setupMapLegend() {
        const legendItems = document.querySelector('.legend-items');
        if (!legendItems) return;
        
        const categoryColors = {
            'Education': '#FF6B6B',
            'Healthcare': '#4ECDC4',
            'Drinking Water': '#45B7D1',
            'Sanitation': '#96CEB4',
            'Electricity': '#FFEAA7',
            'Roads & Connectivity': '#DFE6E9',
            'Skill Development': '#A29BFE',
            'Agriculture & Livelihood': '#6C5CE7',
            'Housing': '#FD79A8',
            'Social Welfare': '#FDCB6E'
        };
        
        legendItems.innerHTML = '';
        Object.entries(categoryColors).forEach(([category, color]) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${color}"></div>
                <span>${category}</span>
            `;
            legendItems.appendChild(legendItem);
        });
    }

    async loadUserReports() {
        const emailInput = document.getElementById('trackingEmail');
        const container = document.getElementById('userReports');
        
        if (!emailInput || !container) return;
        
        const email = emailInput.value.trim();
        if (!email) {
            this.showToast('Please enter your email address', 'error');
            return;
        }
        
        try {
            const reports = await this.db.select('reports', {citizen_contact: email}, {field: 'created_at', direction: 'DESC'});
            
            if (reports.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-24);">No reports found for this email address.</p>';
                return;
            }
            
            container.innerHTML = reports.map(report => `
                <div class="report-item">
                    <div class="report-header">
                        <div class="report-title">${report.title}</div>
                        <div class="report-tags">
                            <span class="report-tag">${report.status}</span>
                            <span class="report-tag priority-${report.priority.toLowerCase()}">${report.priority}</span>
                        </div>
                    </div>
                    <div class="report-meta">
                        <span><strong>Category:</strong> ${report.category}</span>
                        <span><strong>Department:</strong> ${report.assigned_department}</span>
                        <span><strong>Reported:</strong> ${new Date(report.created_at).toLocaleDateString()}</span>
                        <span><strong>ID:</strong> #${report.id}</span>
                    </div>
                    <div class="report-description">${report.description}</div>
                    ${report.address ? `<p><small><strong>Location:</strong> ${report.address}</small></p>` : ''}
                    ${report.internal_notes ? `<p><small><strong>Latest Update:</strong> ${report.internal_notes}</small></p>` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load user reports:', error);
            this.showToast('Failed to load reports', 'error');
        }
    }

    showAdminTab(tabName) {
        // Update tab active state
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.getElementById(`${tabName}Tab`);
        if (activeTab) activeTab.classList.add('active');
        
        // Show content
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}Content`);
        if (activeContent) activeContent.classList.add('active');
        
        // Load content
        setTimeout(() => {
            if (tabName === 'dashboard') {
                this.updateAdminDashboard();
            } else if (tabName === 'reports') {
                this.loadReportsManagement();
            } else if (tabName === 'analytics') {
                this.loadAnalytics();
            } else if (tabName === 'users') {
                this.loadUsersManagement();
            } else if (tabName === 'settings') {
                this.loadSettings();
            }
        }, 100);
    }

    async updateAdminDashboard() {
        try {
            const stats = await this.db.getReportStatistics();
            
            // Update metrics
            const elements = {
                adminTotalReports: document.getElementById('adminTotalReports'),
                adminPendingReports: document.getElementById('adminPendingReports'),
                adminInProgressReports: document.getElementById('adminInProgressReports'),
                adminResolvedReports: document.getElementById('adminResolvedReports')
            };
            
            if (elements.adminTotalReports) elements.adminTotalReports.textContent = stats.total;
            if (elements.adminPendingReports) elements.adminPendingReports.textContent = stats.pending;
            if (elements.adminInProgressReports) elements.adminInProgressReports.textContent = stats.inProgress;
            if (elements.adminResolvedReports) elements.adminResolvedReports.textContent = stats.resolved;
            
            // Load urgent issues
            const urgentReports = await this.db.select('reports', null, {field: 'created_at', direction: 'DESC'});
            const urgentIssues = urgentReports.filter(r => 
                (r.priority === 'High' || r.priority === 'Emergency') && r.status !== 'Resolved'
            ).slice(0, 5);
            
            const urgentContainer = document.getElementById('urgentIssues');
            if (urgentContainer) {
                if (urgentIssues.length === 0) {
                    urgentContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">No urgent issues at this time.</p>';
                } else {
                    urgentContainer.innerHTML = urgentIssues.map(issue => `
                        <div class="urgent-issue">
                            <div class="urgent-issue-info">
                                <div class="urgent-issue-title">${issue.title}</div>
                                <div class="urgent-issue-meta">${issue.category} • ${issue.priority} Priority • ${issue.assigned_department}</div>
                            </div>
                            <button class="btn btn--sm btn--primary" onclick="app.showReportModal(${issue.id})">View</button>
                        </div>
                    `).join('');
                }
            }
            
            // Load recent reports
            const recentReports = urgentReports.slice(0, 5);
            const recentContainer = document.getElementById('recentReports');
            if (recentContainer) {
                recentContainer.innerHTML = recentReports.map(report => `
                    <div class="report-item" style="cursor: pointer;" onclick="app.showReportModal(${report.id})">
                        <div class="report-header">
                            <div class="report-title">${report.title}</div>
                            <div class="report-tags">
                                <span class="report-tag">${report.status}</span>
                            </div>
                        </div>
                        <div class="report-meta">
                            <span>${report.category}</span>
                            <span>${new Date(report.created_at).toLocaleDateString()}</span>
                            <span>${report.assigned_department}</span>
                        </div>
                    </div>
                `).join('');
            }
            
            // Load department workload
            const workloadContainer = document.getElementById('departmentWorkload');
            if (workloadContainer) {
                const departments = await this.db.select('departments');
                
                workloadContainer.innerHTML = departments.map(dept => {
                    const deptReports = urgentReports.filter(r => r.assigned_department === dept.name);
                    const pending = deptReports.filter(r => r.status === 'Pending').length;
                    const inProgress = deptReports.filter(r => r.status === 'In Progress').length;
                    
                    return `
                        <div class="department-card">
                            <div class="department-name">${dept.name}</div>
                            <div class="department-stats">
                                <span>Pending: ${pending}</span>
                                <span>In Progress: ${inProgress}</span>
                                <span>Total: ${deptReports.length}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Failed to update admin dashboard:', error);
        }
    }

    async loadReportsManagement() {
        try {
            this.loadCategories();
            await this.loadDepartmentFilters();
            this.setupReportsFilters();
            
            const reports = await this.db.getReportsWithDetails();
            this.renderReportsTable(reports);
        } catch (error) {
            console.error('Failed to load reports management:', error);
        }
    }

    async loadDepartmentFilters() {
        try {
            const departments = await this.db.select('departments');
            const adminDepartmentFilter = document.getElementById('adminDepartmentFilter');
            
            if (adminDepartmentFilter) {
                adminDepartmentFilter.innerHTML = '<option value="">All Departments</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.name;
                    option.textContent = dept.name;
                    adminDepartmentFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load department filters:', error);
        }
    }

    setupReportsFilters() {
        const filters = ['adminCategoryFilter', 'adminStatusFilter', 'adminDepartmentFilter'];
        const searchInput = document.getElementById('searchReports');
        
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.removeEventListener('change', this.filterReports.bind(this));
                filter.addEventListener('change', this.filterReports.bind(this));
            }
        });
        
        if (searchInput) {
            searchInput.removeEventListener('input', this.filterReports.bind(this));
            searchInput.addEventListener('input', Utils.debounce(this.filterReports.bind(this), 300));
        }
    }

    // Removed duplicate debounce function - now using Utils.debounce

    async filterReports() {
        try {
            let reports = await this.db.getReportsWithDetails();
            
            const categoryValue = document.getElementById('adminCategoryFilter')?.value;
            const statusValue = document.getElementById('adminStatusFilter')?.value;
            const departmentValue = document.getElementById('adminDepartmentFilter')?.value;
            const searchTerm = document.getElementById('searchReports')?.value.toLowerCase().trim();
            
            if (categoryValue) {
                reports = reports.filter(r => r.category === categoryValue);
            }
            
            if (statusValue) {
                reports = reports.filter(r => r.status === statusValue);
            }
            
            if (departmentValue) {
                reports = reports.filter(r => r.assigned_department === departmentValue);
            }
            
            if (searchTerm) {
                reports = reports.filter(r => 
                    r.title.toLowerCase().includes(searchTerm) || 
                    r.description.toLowerCase().includes(searchTerm) ||
                    r.address?.toLowerCase().includes(searchTerm)
                );
            }
            
            this.renderReportsTable(reports);
        } catch (error) {
            console.error('Failed to filter reports:', error);
        }
    }

    renderReportsTable(reports) {
        const isAdmin = this.currentUserRole === 'admin';
        const isStaff = this.currentUserRole === 'staff';

        const container = document.getElementById('reportsTable');
        if (!container) return;
        
        if (reports.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: var(--space-24); color: var(--color-text-secondary);">No reports found matching your criteria.</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Issue</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Department</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(report => `
                        <tr>
                            <td>#${report.id}</td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${report.title}">${report.title}</td>
                            <td>${report.category}</td>
                            <td style="font-size: 0.85em;">${report.subcategory || 'N/A'}</td>
                            <td>
                                ${(isAdmin||isStaff) ? `
                                    <select class="priority-selector" data-id="${report.id}"
                                    onchange="app.updateReportPriority(${report.id}, this.value)">
                                    <option value="Low" ${report.priority==='Low'?'selected':''}>Low</option>
                                    <option value="Medium" ${report.priority==='Medium'?'selected':''}>Medium</option>
                                    <option value="High" ${report.priority==='High'?'selected':''}>High</option>
                                    <option value="Emergency" ${report.priority==='Emergency'?'selected':''}>Emergency</option>
                                    </select>
                                ` : `<span>${report.priority}</span>`}
                            </td>
                            <td><span class="status status--${this.getStatusClass(report.status)}">${report.status}</span></td>
                            <td>${report.assigned_department}</td>
                            <td>${new Date(report.created_at).toLocaleDateString()}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn--primary" onclick="app.showReportModal(${report.id})">View</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    async updateReportPriority(id, value) {
        try {
            await this.db.update('reports', { priority: value }, { id });
            this.showToast('Priority updated successfully', 'success');
            this.loadReportsManagement();
        } catch (error) {
            console.error('Priority update failed:', error);
            this.showToast('Failed to update priority', 'error');
        }
    }

    getStatusClass(status) {
        switch(status) {
            case 'Pending': return 'info';
            case 'In Progress': return 'warning';
            case 'Resolved': return 'success';
            default: return 'info';
        }
    }

    async showReportModal(reportId) {
        try {
            const reports = await this.db.select('reports');
            const report = reports.find(r => r.id === reportId);
            
            if (!report) {
                this.showToast('Report not found', 'error');
                return;
            }
            
            const modalBody = document.getElementById('reportModalBody');
            if (!modalBody) return;
            
            modalBody.innerHTML = `
                <div class="report-details">
                    <h4>${report.title}</h4>
                    <div class="report-meta">
                        <p><strong>ID:</strong> #${report.id}</p>
                        <p><strong>Category:</strong> ${report.category}</p>
                        ${report.subcategory ? `<p><strong>Specific Issue:</strong> ${report.subcategory}</p>` : ''}
                        <p><strong>Priority:</strong> ${report.priority}</p>
                        <p><strong>Status:</strong> ${report.status}</p>
                        <p><strong>Department:</strong> ${report.assigned_department}</p>
                        <p><strong>Created:</strong> ${new Date(report.created_at).toLocaleString()}</p>
                        <p><strong>Updated:</strong> ${new Date(report.updated_at).toLocaleString()}</p>
                        <p><strong>Contact:</strong> ${report.citizen_contact || 'Anonymous'}</p>
                    </div>
                    ${report.address ? `<p><strong>Village/Location:</strong> ${report.address}</p>` : ''}
                    ${report.latitude && report.longitude ? `<p><strong>Coordinates:</strong> ${report.latitude}, ${report.longitude}</p>` : ''}
                    <div class="report-description">
                        <strong>Description:</strong>
                        <p>${report.description}</p>
                    </div>
                    ${report.photo_path ? `
                        <div class="report-photo">
                            <strong>Photo:</strong>
                            <img src="${report.photo_path}" alt="Report photo" style="max-width: 100%; height: auto; border-radius: var(--radius-base); margin-top: var(--space-8);">
                        </div>
                    ` : ''}
                    <div class="status-update-form">
                        <label for="modalStatusSelect">Update Status:</label>
                        <select id="modalStatusSelect" class="form-control">
                            <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Resolved" ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                        <label for="modalDepartmentSelect">Assign Department:</label>
                        <select id="modalDepartmentSelect" class="form-control">
                            ${await this.getDepartmentOptions(report.assigned_department)}
                        </select>
                        <label for="modalNotesText">Internal Notes:</label>
                        <textarea id="modalNotesText" class="form-control" rows="3" placeholder="Add internal notes...">${report.internal_notes || ''}</textarea>
                    </div>
                </div>
            `;
            
            const updateBtn = document.getElementById('updateStatusBtn');
            if (updateBtn) {
                updateBtn.onclick = () => this.updateModalReport(reportId);
            }
            
            // Add delete button for admins
            const modal = document.getElementById('reportModal');
            const modalFooter = modal.querySelector('.modal-footer');
            if (this.currentUserRole === 'admin' && modalFooter) {
                // Remove existing delete button if any
                const existingDeleteBtn = document.getElementById('deleteReportBtn');
                if (existingDeleteBtn) {
                    existingDeleteBtn.remove();
                }
                
                // Create new delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.id = 'deleteReportBtn';
                deleteBtn.className = 'btn btn--outline';
                deleteBtn.style.marginRight = 'auto';
                deleteBtn.style.color = 'var(--color-error)';
                deleteBtn.style.borderColor = 'var(--color-error)';
                deleteBtn.textContent = 'Delete Report';
                deleteBtn.onclick = () => this.deleteReport(reportId);
                
                // Insert at the beginning of modal footer
                modalFooter.insertBefore(deleteBtn, modalFooter.firstChild);
            }
            
            this.showModal();
        } catch (error) {
            console.error('Failed to show report modal:', error);
            this.showToast('Failed to load report details', 'error');
        }
    }

    async getDepartmentOptions(currentDepartment) {
        try {
            const departments = await this.db.select('departments');
            return departments.map(dept => `
                <option value="${dept.name}" ${dept.name === currentDepartment ? 'selected' : ''}>${dept.name}</option>
            `).join('');
        } catch (error) {
            console.error('Failed to get department options:', error);
            return `<option value="${currentDepartment}" selected>${currentDepartment}</option>`;
        }
    }

    async updateModalReport(reportId) {
        try {
            const statusSelect = document.getElementById('modalStatusSelect');
            const departmentSelect = document.getElementById('modalDepartmentSelect');
            const notesText = document.getElementById('modalNotesText');
            
            if (!statusSelect || !departmentSelect || !notesText) {
                this.showToast('Form elements not found', 'error');
                return;
            }

            // Build update object with only the fields we want to change
            const updateData = {
                status: statusSelect.value,
                assigned_department: departmentSelect.value,
                internal_notes: notesText.value
            };

            // Store old values for the success message
            const reports = await this.db.select('reports', { id: reportId });
            const oldReport = reports[0];
            
            if (!oldReport) {
                this.showToast('Report not found', 'error');
                return;
            }

            const oldStatus = oldReport.status;
            const oldDepartment = oldReport.assigned_department;
            
            // Perform the update
            await this.db.update('reports', updateData, { id: reportId });
            
            // Build success message
            let message = 'Report updated successfully';
            if (oldStatus !== updateData.status) {
                message += ` - Status changed to ${updateData.status}`;
            }
            if (oldDepartment !== updateData.assigned_department) {
                message += ` - Reassigned to ${updateData.assigned_department}`;
            }
            
            this.showToast(message, 'success');
            this.hideModal();
            this.updateAdminDashboard();
            this.loadReportsManagement();
            
            // Simulate WebSocket notification
            if (this.wsConnection) {
                this.wsConnection.send({
                    type: 'status_update',
                    reportId,
                    newStatus: updateData.status,
                    department: updateData.assigned_department
                });
            }
        } catch (error) {
            console.error('Failed to update report:', error);
            this.showToast('Failed to update report: ' + error.message, 'error');
        }
    }

    showModal() {
        const modal = document.getElementById('reportModal');
        if (modal) modal.classList.remove('hidden');
    }

    hideModal() {
        const modal = document.getElementById('reportModal');
        if (modal) modal.classList.add('hidden');
    }

    async loadAnalytics() {
        try {
            const stats = await this.db.getReportStatistics();
            
            // Update analytics summary
            const avgResponseTime = document.getElementById('avgResponseTime');
            const resolutionRate = document.getElementById('resolutionRate');
            const satisfactionRate = document.getElementById('satisfactionRate');
            
            if (avgResponseTime) avgResponseTime.textContent = (2.3 + Math.random() * 0.4).toFixed(1);
            if (resolutionRate) resolutionRate.textContent = Math.floor(87 + Math.random() * 10);
            if (satisfactionRate) satisfactionRate.textContent = (4.2 + Math.random() * 0.6).toFixed(1);
            
            // Create charts
            setTimeout(() => {
                this.createReportsChart();
                this.createCategoryChart(stats);
                this.createResolutionChart();
                this.createDepartmentChart(stats);
            }, 100);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    async createReportsChart() {
        const canvas = document.getElementById('reportsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.reports) {
            this.charts.reports.destroy();
        }
        
        try {
            const reports = await this.db.select('reports', null, {field: 'created_at', direction: 'ASC'});
            
            // Group reports by month
            const monthlyData = {};
            reports.forEach(report => {
                const date = new Date(report.created_at);
                const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                monthlyData[month] = (monthlyData[month] || 0) + 1;
            });
            
            this.charts.reports = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Object.keys(monthlyData),
                    datasets: [{
                        label: 'Reports Submitted',
                        data: Object.values(monthlyData),
                        borderColor: '#1FB8CD',
                        backgroundColor: 'rgba(31, 184, 205, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Reports Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create reports chart:', error);
        }
    }

    createCategoryChart(stats) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.byCategory),
                datasets: [{
                    data: Object.values(stats.byCategory),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reports by Category'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createResolutionChart() {
        const canvas = document.getElementById('resolutionChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.resolution) {
            this.charts.resolution.destroy();
        }
        
        // Mock resolution time data
        const avgResolutionTimes = {
            'Potholes': 3.5,
            'Street Lights': 2.1,
            'Trash Collection': 1.8,
            'Water Issues': 4.2,
            'Traffic Signs': 2.9,
            'Graffiti': 5.1,
            'Parks & Recreation': 3.7,
            'Other': 3.3
        };
        
        this.charts.resolution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(avgResolutionTimes),
                datasets: [{
                    label: 'Average Days to Resolution',
                    data: Object.values(avgResolutionTimes),
                    backgroundColor: '#1FB8CD'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Average Resolution Time by Category'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Days'
                        }
                    }
                }
            }
        });
    }

    createDepartmentChart(stats) {
        const canvas = document.getElementById('departmentChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.department) {
            this.charts.department.destroy();
        }
        
        this.charts.department = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.byDepartment),
                datasets: [{
                    label: 'Total Reports',
                    data: Object.values(stats.byDepartment),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reports by Department'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadUsersManagement() {
        try {
            const users = await this.db.select('users');
            const departments = await this.db.select('departments');
            
            // Populate department dropdown in user modal
            const userDepartmentSelect = document.getElementById('userDepartment');
            if (userDepartmentSelect) {
                userDepartmentSelect.innerHTML = '<option value="">Select department...</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.name;
                    option.textContent = dept.name;
                    userDepartmentSelect.appendChild(option);
                });
            }
            
            const container = document.getElementById('usersTable');
            if (container) {
                container.innerHTML = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>#${user.id}</td>
                                    <td>${user.name}</td>
                                    <td>${user.email}</td>
                                    <td><span class="status status--${user.role === 'admin' ? 'error' : 'info'}">${user.role}</span></td>
                                    <td>${user.department || 'N/A'}</td>
                                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div class="table-actions">
                                            <button class="btn btn-sm btn--outline" onclick="app.editUser(${user.id})">Edit</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        } catch (error) {
            console.error('Failed to load users management:', error);
        }
    }

    showUserModal() {
        const modal = document.getElementById('userModal');
        if (modal) modal.classList.remove('hidden');
        
        // Reset form
        const form = document.getElementById('userForm');
        if (form) form.reset();
    }

    hideUserModal() {
        const modal = document.getElementById('userModal');
        if (modal) modal.classList.add('hidden');
    }
    // === Modal Display Methods ===

    showAddDepartmentModal() {
        const modal = document.createElement('div');
        modal.id = 'addDepartmentModal';
        modal.className = 'modal';
        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
            <h3>Add New Department</h3>
            <button class="close-btn" onclick="app.hideAddDepartmentModal()">&times;</button>
            </div>
            <div class="modal-body">
            <input type="text" id="newDepartmentName" placeholder="Department Name" required />
            <input type="email" id="newDepartmentEmail" placeholder="Contact Email (optional)" />
            <input type="tel" id="newDepartmentPhone" placeholder="Contact Phone (optional)" />
            </div>
            <div class="modal-footer">
            <button class="btn btn--primary" onclick="app.saveNewDepartment()">Add</button>
            <button class="btn btn--outline" onclick="app.hideAddDepartmentModal()">Cancel</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }

    showAddCategoryModal() {
        const modal = document.createElement('div');
        modal.id = 'addCategoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
            <h3>Add New Category</h3>
            <button class="close-btn" onclick="app.hideAddCategoryModal()">&times;</button>
            </div>
            <div class="modal-body">
            <input type="text" id="newCategoryName" placeholder="Category Name" required />
            <select id="newCategoryDepartment">
                <option value="">Select Department</option>
            </select>
            </div>
            <div class="modal-footer">
            <button class="btn btn--primary" onclick="app.saveNewCategory()">Add</button>
            <button class="btn btn--outline" onclick="app.hideAddCategoryModal()">Cancel</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        this.loadDepartmentOptionsForCategory();
    }

    // === Helper Methods ===

    hideAddDepartmentModal() {
        document.getElementById('addDepartmentModal')?.remove();
    }
    hideAddCategoryModal() {
        document.getElementById('addCategoryModal')?.remove();
    }

    // Populate department dropdown in the Add Category modal
    async loadDepartmentOptionsForCategory() {
        const depts = await this.db.select('departments');
        const sel = document.getElementById('newCategoryDepartment');
        sel.innerHTML = '<option value="">Select Department</option>';
        depts.forEach(d => {
            const o = document.createElement('option');
            o.value = d.name;
            o.textContent = d.name;
            sel.appendChild(o);
        });
    }

    // Save new department to Supabase
    async saveNewDepartment() {
        const name  = document.getElementById('newDepartmentName').value.trim();
        const email = document.getElementById('newDepartmentEmail').value.trim() || null;
        const phone = document.getElementById('newDepartmentPhone').value.trim()  || null;
        if (!name) { alert('Name is required'); return; }
        // Prevent duplicates
        const existing = await this.db.select('departments');
        if (existing.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        alert('Department exists'); return;
        }
        await this.db.insert('departments', { name, contact_email: email, contact_phone: phone });
        this.hideAddDepartmentModal();
        this.loadSettings();              // refresh settings page
        this.loadDepartmentFilters();     // refresh dropdowns
    }

    // Save new category to Supabase
    async saveNewCategory() {
        const name = document.getElementById('newCategoryName').value.trim();
        const dept = document.getElementById('newCategoryDepartment').value;
        if (!name || !dept) { alert('All fields required'); return; }
        const existing = await this.db.select('categories');
        if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('Category exists'); return;
        }
        await this.db.insert('categories', { name, department_mapping: dept });
        this.hideAddCategoryModal();
        this.loadSettings();     // refresh settings
        this.loadCategories();   // refresh report form dropdown
    }


    async saveUser() {
        try {
            const formData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                password: document.getElementById('userPassword').value.trim(),
                confirmPassword: document.getElementById('confirmPassword').value.trim(),
                role: document.getElementById('userRole').value,
                department: document.getElementById('userDepartment').value || null
            };

            await this.auth.createUser(formData);

            this.showToast(`User created successfully`, 'success');
            this.hideUserModal();
            this.loadUsersManagement();
        } catch (err) {
            console.error(err);
            this.showToast(err.message || 'Failed to create user', 'error');
        }
    }

    async loadSettings() {
        try {
            const categories = await this.db.select('categories');
            const departments = await this.db.select('departments');
            
            // Render categories
            const categoriesContainer = document.getElementById('categoriesList');
            if (categoriesContainer) {
                categoriesContainer.innerHTML = categories.map(cat => `
                    <div class="category-item">
                        <div>
                            <strong>${cat.name}</strong><br>
                            <small>Maps to: ${cat.department_mapping}</small>
                            ${cat.description ? `<br><small>${cat.description}</small>` : ''}
                        </div>
                        <div>
                            <button class="btn btn-sm btn--outline" onclick="app.editCategory(${cat.id})">Edit</button>
                        </div>
                    </div>
                `).join('');
            }
            
            // Render departments
            const departmentsContainer = document.getElementById('departmentsList');
            if (departmentsContainer) {
                departmentsContainer.innerHTML = departments.map(dept => `
                    <div class="department-item">
                        <div>
                            <strong>${dept.name}</strong><br>
                            <small>Email: ${dept.contact_email}</small><br>
                            <small>Phone: ${dept.contact_phone}</small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn--outline" onclick="app.editDepartment(${dept.id})">Edit</button>
                        </div>
                    </div>
                `).join('');
            }
            
            // Update database info
            const stats = await this.db.getReportStatistics();
            const totalRecords = stats.total + categories.length + departments.length;
            
            const totalRecordsEl = document.getElementById('totalRecords');
            const dbSizeEl = document.getElementById('dbSize');
            const lastBackupEl = document.getElementById('lastBackup');
            
            if (totalRecordsEl) totalRecordsEl.textContent = totalRecords;
            if (dbSizeEl) dbSizeEl.textContent = Math.floor(totalRecords * 2.5); // Rough estimate
            if (lastBackupEl) lastBackupEl.textContent = localStorage.getItem('lastBackup') || 'Never';
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async backupDatabase() {
        try {
            const reports = await this.db.select('reports');
            const users = await this.db.select('users');
            const categories = await this.db.select('categories');
            const departments = await this.db.select('departments');
            
            const backup = {
                timestamp: new Date().toISOString(),
                data: {
                    reports,
                    users,
                    categories,
                    departments
                }
            };
            
            const dataStr = JSON.stringify(backup, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `civic-reports-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            localStorage.setItem('lastBackup', new Date().toLocaleString());
            this.showToast('Database backup downloaded successfully', 'success');
            this.loadSettings(); // Refresh to show updated backup time
        } catch (error) {
            console.error('Failed to backup database:', error);
            this.showToast('Failed to create backup', 'error');
        }
    }

    async clearDatabase() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                // Clear all object stores
                const storeNames = ['reports', 'users', 'categories', 'departments'];
                
                for (const storeName of storeNames) {
                    const transaction = this.db.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    await new Promise((resolve, reject) => {
                        const request = store.clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
                
                // Re-seed with sample data
                await this.db.seedData();
                
                this.showToast('Database cleared and reseeded with sample data', 'success');
                this.updateStats();
                this.loadSettings();
            } catch (error) {
                console.error('Failed to clear database:', error);
                this.showToast('Failed to clear database', 'error');
            }
        }
    }

    resetReportForm() {
        const form = document.getElementById('issueForm');
        if (form) form.reset();
        
        const preview = document.getElementById('photoPreview');
        if (preview) preview.classList.add('hidden');
        
        const locationDisplay = document.getElementById('locationDisplay');
        if (locationDisplay) {
            locationDisplay.innerHTML = '';
            locationDisplay.classList.remove('active');
        }
        
        // Hide analyze button and clear status
        const analyzeBtn = document.getElementById('analyzePhotoBtn');
        if (analyzeBtn) analyzeBtn.style.display = 'none';
        
        const analyzeStatus = document.getElementById('analyzeStatus');
        if (analyzeStatus) {
            analyzeStatus.className = 'analyze-status';
            analyzeStatus.innerHTML = '';
        }
        
        // Remove AI badges and styling
        document.querySelectorAll('.ai-suggestion-badge').forEach(badge => badge.remove());
        document.querySelectorAll('.ai-filled').forEach(el => el.classList.remove('ai-filled'));
        
        this.currentLocation = null;
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const messageEl = document.getElementById('toastMessage');
        
        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                this.hideToast();
            }, 5000);
        }
    }

    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) toast.classList.add('hidden');
    }
    async exportReportsToExcel() {
        const rows = await this.db.getReportsWithDetails();
        const csv = this.convertToCSV(rows);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async exportReportsToPDF() {
        const rows = await this.db.getReportsWithDetails();
        let text = `Civic Reports\nGenerated: ${new Date().toLocaleString()}\n\n`;
        rows.forEach(r => {
            text += `#${r.id} | ${r.title}\nPriority: ${r.priority}\nStatus: ${r.status}\n\n`;
        });
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        const keys = Object.keys(data[0]||{});
        const lines = [keys.join(',')];
        data.forEach(obj => {
            lines.push(keys.map(k=>`"${(obj[k]||'').toString().replace(/"/g,'""')}"`).join(','));
        });
        return lines.join('\n');
    }
loadSchemes() {
        const container = document.getElementById('schemesList');
        if (!container) return;

        container.innerHTML = this.schemesData.map(category => `
            <div class="scheme-category">
                <h3>${category.title}</h3>
                <div class="schemes-grid">
                    ${category.schemes.map(scheme => `
                        <a href="${scheme.url}" target="_blank" rel="noopener noreferrer" class="scheme-card">
                            <h4>${scheme.name}</h4>
                        </a>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
}

// Initialize the SQLite-powered app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SQLite-powered CivicReport app...');
    window.app = new CivicReportApp();
    window.app.init();
});

// Export for global access
window.CivicReportApp = CivicReportApp;
