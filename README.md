# 🏛️ SAKSHAM - Smart Civic Issue Reporting System

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [How to Access Features](#-how-to-access-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Database Setup](#-database-setup)
- [Deployment](#-deployment)
- [User Roles](#-user-roles)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)

---

## 🎯 About the Project

**SAKSHAM** is a citizen-centric platform designed to bridge the gap between rural communities and local governance. It enables citizens to report civic issues (roads, water supply, sanitation, electricity, etc.) with photo evidence and GPS location, while providing government staff and administrators with powerful tools to track, assign, and resolve these issues efficiently.

### The Problem

- Citizens struggle to report village-level issues effectively
- No centralized tracking of civic complaints
- Lack of transparency in issue resolution
- Language barriers for rural users
- No accountability with SLA tracking

### Our Solution

- Easy-to-use mobile-friendly interface
- Multi-language support (11 Indian languages)
- Real-time status tracking with notifications
- AI-powered chatbot assistance
- Staff assignment with SLA tracking
- Comprehensive admin dashboard with analytics

---

## ✨ Key Features

### 🌓 Dark/Light Mode Toggle

Switch between light and dark themes for comfortable viewing.

### 📱 Progressive Web App (PWA)

Install on your device for offline access and native app experience.

### 🤖 AI Chatbot (Gemini)

Get instant answers about government schemes, report status, and platform help.

### 🗣️ Voice Input

Speak to fill forms and chat with the AI assistant.

### 📍 GPS Location

Auto-detect location or pick from interactive map.

### 📸 Photo Upload

Attach evidence photos with automatic compression.

### 💬 In-App Messaging

Direct communication between citizens and staff.

### ⏱️ SLA Tracking

Priority-based deadlines with visual indicators.

### 🌐 Multilingual (11 Languages)

English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia.

### ♿ Accessibility (WCAG 2.1)

Skip links, keyboard navigation, screen reader support, high contrast mode.

### 📊 Analytics Dashboard

Charts, statistics, and exportable reports (PDF/Excel).

### 🔔 Real-time Notifications

Instant updates when your report status changes.

### 📴 Offline Support

Queue reports when offline, auto-sync when back online.

---

## 🚀 How to Access Features

### 🌓 Dark/Light Mode

| Method         | Action                                                            |
| -------------- | ----------------------------------------------------------------- |
| **Button**     | Click the `🌙 Dark` / `☀️ Light` button in the top navigation bar |
| **Auto**       | System preference is auto-detected on first visit                 |
| **Persistent** | Your preference is saved and remembered                           |

The toggle appears on all pages in the navigation bar.

**How it works:**

- **Light Mode (Default)**: White background with dark text, optimized for daylight viewing
- **Dark Mode**: Dark background with light text, reduces eye strain in low-light conditions
- Click the button to switch instantly - no page reload required!

---

### 🌐 Language Selection

| Method       | Action                                            |
| ------------ | ------------------------------------------------- |
| **Selector** | Click `🌐 English` dropdown in the navigation bar |
| **Choose**   | Select from 11 available languages                |
| **Auto**     | Browser language is auto-detected initially       |

**Supported Languages:**

- 🇬🇧 English
- 🇮🇳 हिन्दी (Hindi)
- 🇮🇳 தமிழ் (Tamil)
- 🇮🇳 తెలుగు (Telugu)
- 🇮🇳 বাংলা (Bengali)
- 🇮🇳 मराठी (Marathi)
- 🇮🇳 ગુજરાતી (Gujarati)
- 🇮🇳 ಕನ್ನಡ (Kannada)
- 🇮🇳 മലയാളം (Malayalam)
- 🇮🇳 ਪੰਜਾਬੀ (Punjabi)
- 🇮🇳 ଓଡ଼ିଆ (Odia)

---

### ♿ Accessibility Settings

| Method       | Action                                              |
| ------------ | --------------------------------------------------- |
| **Button**   | Click the `♿` button (bottom-left floating button) |
| **Shortcut** | Press `Alt + 0`                                     |

**Available Settings:**

- 🔤 **Text Size**: Adjust from 80% to 150%
- 🎨 **High Contrast**: Enhanced visibility mode
- 🚫 **Reduce Motion**: Disable animations
- 🎯 **Focus Indicators**: Enhanced keyboard focus

---

### 💬 In-App Messaging

| Method     | Action                                        |
| ---------- | --------------------------------------------- |
| **Button** | Click the `💬` floating button (bottom-right) |
| **Tabs**   | Switch between Inbox, Sent, and Assignments   |

**Features:**

- 📥 **Inbox**: Receive messages from staff/admin
- 📤 **Sent**: View your sent messages
- 👥 **Assignments**: (Staff/Admin) View assigned reports with SLA
- ✏️ **Compose**: Send new messages to staff

**SLA Priority Levels:**
| Priority | Deadline | Badge Color |
|----------|----------|-------------|
| Urgent | 4 hours | 🔴 Red |
| High | 1 day | 🟠 Orange |
| Medium | 3 days | 🟡 Yellow |
| Low | 7 days | 🟢 Green |

---

### 🤖 AI Chatbot

| Method     | Action                                         |
| ---------- | ---------------------------------------------- |
| **Button** | Click the `💬 Chat` button on the landing page |
| **Voice**  | Click the 🎤 microphone for voice input        |

**Ask About:**

- Government schemes (PM Awas Yojana, MGNREGA, etc.)
- How to submit a report
- Track your report status
- Platform navigation help

---

### 📝 Submit a Report (Citizens)

1. **Login** as Citizen
2. Click **"Report Issue"** or **"New Report"**
3. Fill the form:
    - Select **Category** (Water, Roads, Electricity, etc.)
    - Select **Subcategory**
    - Write **Description** (min 20 characters)
    - **Upload Photo** (optional but recommended)
    - **Mark Location** on map or use GPS
4. Click **Submit**

**Categories Available:**

- 💧 Water Supply
- 🛣️ Roads & Infrastructure
- ⚡ Electricity
- 🚽 Sanitation
- 🏥 Health Services
- 📚 Education
- 🏗️ Construction
- 🌳 Environment
- 📱 Other

---

### 📊 Admin Dashboard

| Feature              | How to Access                                          |
| -------------------- | ------------------------------------------------------ |
| **View All Reports** | Login as Admin → Dashboard shows all reports           |
| **Assign to Staff**  | Click "Assign" on any report → Select staff + priority |
| **View Statistics**  | Dashboard shows charts and metrics                     |
| **Export Data**      | Click "Export PDF" or "Export Excel"                   |
| **Manage Users**     | Settings → User Management                             |

**Dashboard Sections:**

- 📈 **Statistics Cards**: Total, Pending, In Progress, Resolved counts
- 📊 **Charts**: Category distribution, Status breakdown, Trends
- 📋 **Reports Table**: Sortable, filterable list of all reports
- 🗺️ **Map View**: Geographic distribution of issues

---

### 👷 Staff Dashboard

| Feature             | How to Access                         |
| ------------------- | ------------------------------------- |
| **View Assigned**   | Login as Staff → See assigned reports |
| **Update Status**   | Click report → Change status → Save   |
| **SLA Tracking**    | Color indicators show deadline status |
| **Message Citizen** | Click message icon on report          |

**Status Options:**

- ⏳ Pending
- 👤 Assigned
- 🔄 In Progress
- ✅ Resolved
- ❌ Rejected

---

### 📱 Install as App (PWA)

**On Mobile (Android/iOS):**

1. Open the website in Chrome/Safari
2. Tap the browser menu (⋮ or share icon)
3. Select "Add to Home Screen" / "Install App"

**On Desktop (Chrome/Edge):**

1. Look for the install icon (⊕) in the address bar
2. Click "Install"

**Benefits:**

- Works offline
- Faster loading
- Push notifications
- Full-screen experience

---

## ⌨️ Keyboard Shortcuts

| Shortcut      | Action                 |
| ------------- | ---------------------- |
| `Alt + 1`     | Go to Home             |
| `Alt + 2`     | Go to My Reports       |
| `Alt + 3`     | New Report Form        |
| `Alt + 0`     | Accessibility Settings |
| `Escape`      | Close modal/overlay    |
| `Tab`         | Navigate forward       |
| `Shift + Tab` | Navigate backward      |

---

## 🛠️ Tech Stack

| Category     | Technology                              |
| ------------ | --------------------------------------- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript         |
| **Backend**  | Supabase (PostgreSQL + Auth + Realtime) |
| **AI/ML**    | Google Gemini 2.0 Flash                 |
| **Maps**     | Leaflet.js + OpenStreetMap              |
| **Charts**   | Chart.js                                |
| **PWA**      | Service Worker + Web App Manifest       |

---

## 📦 Installation

### Prerequisites

- Node.js 18+ (for local development)
- Git
- Supabase account
- Google AI Studio account (for Gemini API)

### 1. Clone the Repository

```bash
git clone https://github.com/valiantVanshy/CivicIssueRep.git

```

### 2. Install Dependencies (Optional)

```bash
npm install
```

### 3. Start Local Server

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve -p 8080

# Using VS Code Live Server
# Right-click index.html → "Open with Live Server"
```

### 4. Open in Browser

```
http://localhost:8080
```

---

## ⚙️ Configuration

### Environment Variables

| Variable            | Description                   |
| ------------------- | ----------------------------- |
| `SUPABASE_URL`      | Your Supabase project URL     |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `GEMINI_API_KEY`    | Gemini API key (server-side only; set in Vercel environment variables) |

Never put `GEMINI_API_KEY` in `js/config.js`, frontend code, or any public
environment variable. The browser calls `/api/gemini`; the serverless function reads
the key from its environment. Do not fall back to calling Google directly from the
browser. For local AI testing, use Vercel's local development server with the key
configured in your local server environment.

If a key has already been committed or shared, revoke it and create a replacement
before deploying; removing it from the latest files does not remove it from Git history.

---

## 🗄️ Database Setup

### Required Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Users/Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    role TEXT DEFAULT 'citizen',
    department TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    image_url TEXT,
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES profiles(id),
    from_name TEXT,
    to_user_id UUID REFERENCES profiles(id),
    to_name TEXT,
    subject TEXT,
    body TEXT,
    report_id UUID REFERENCES reports(id),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Report Assignments table (for SLA tracking)
CREATE TABLE report_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id),
    assigned_to UUID REFERENCES profiles(id),
    assigned_by UUID REFERENCES profiles(id),
    priority TEXT,
    notes TEXT,
    sla_deadline TIMESTAMP,
    completed_at TIMESTAMP,
    status TEXT DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    department_mapping TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Citizens can view own reports" ON reports
    FOR SELECT USING (auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
```

---

## 👥 User Roles

### 👤 Citizen

- Register/Login with email
- Submit issue reports with photos
- Track report status in real-time
- Chat with AI assistant
- Receive push notifications
- Send messages to staff

### 👷 Staff

- View reports assigned to them
- Update report status
- Communicate with citizens
- Track SLA deadlines
- View department statistics

### 🔐 Administrator

- Full dashboard access
- Assign reports to any staff
- Manage users and roles
- View all statistics and analytics
- Export reports (PDF/Excel)
- Manage categories and departments
- Image moderation queue

### Default Test Credentials

| Role    | Email                  | Password      |
| ------- | ---------------------- | ------------- |
| Admin   | admin@city.gov         | admin123      |
| Staff   | staff@city.gov         | staff123      |
| Citizen | (Register new account) | (Your choice) |

⚠️ **Important: Change default passwords in production!**

---

## 📁 Project Structure

```
saksham-civic-report/
│
├── 📄 index.html              # Main HTML file (single-page app)
├── 📄 app.js                  # Main application logic (3000+ lines)
├── 📄 style.css               # Main stylesheet
├── 📄 service-worker.js       # PWA service worker (offline support)
├── 📄 manifest.json           # PWA manifest (app metadata)
├── 📄 build-config.js         # Build-time config generator
├── 📄 package.json            # Node.js dependencies
├── 📄 README.md               # This documentation
│
├── 📁 api/                    # Serverless API functions
│   └── gemini.js              # AI proxy (hides API key server-side)
│
├── 📁 css/
│   ├── loading-validation.css # Loading spinners, validation states
│   └── advanced-features.css  # Dark mode, messaging, accessibility
│
├── 📁 js/
│   ├── config.js              # Configuration (auto-generated)
│   ├── auth.js                # Authentication (Supabase Auth)
│   ├── validation.js          # Form validation utilities
│   ├── loading.js             # Loading state management
│   ├── utils.js               # Common utility functions
│   ├── darkmode.js            # 🌓 Dark/Light theme toggle
│   ├── voice-input.js         # 🎤 Voice recognition
│   ├── realtime.js            # 🔔 Real-time notifications
│   ├── pwa.js                 # 📱 PWA install prompt
│   ├── offline-sync.js        # 📴 Offline queue & sync
│   ├── image-moderation.js    # 🖼️ Image auto-moderation
│   ├── rbac.js                # 🔐 Role-based access control
│   ├── messaging.js           # 💬 In-app messaging & SLA
│   ├── i18n.js                # 🌐 Internationalization (11 languages)
│   ├── a11y.js                # ♿ Accessibility features
│   └── export.js              # 📊 PDF/Excel export
│
└── 📁 icons/                  # PWA icons (various sizes)
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

---

## 🔒 Security Features

- ✅ **Server-side API key protection** - Gemini API key never exposed to client
- ✅ **Role-based access control (RBAC)** - Different permissions per role
- ✅ **Session timeout** - Auto-logout after inactivity
- ✅ **CSRF protection** - Token-based request validation
- ✅ **Input validation** - Client and server-side validation
- ✅ **Image moderation** - AI-powered content filtering
- ✅ **Rate limiting** - 10 AI requests per minute per IP
- ✅ **Supabase Row Level Security** - Database-level access control

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login as Citizen, Staff, Admin
- [ ] Submit a report with photo and location
- [ ] Toggle dark/light mode
- [ ] Change language
- [ ] Use keyboard navigation
- [ ] Test on mobile device
- [ ] Install as PWA
- [ ] Test offline submission
- [ ] Test AI chatbot
- [ ] Assign report (as admin)
- [ ] Update report status (as staff)

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**
    ```bash
    git checkout -b feature/amazing-feature
    ```
3. **Make your changes**
4. **Commit with clear message**
    ```bash
    git commit -m 'Add amazing feature'
    ```
5. **Push to your fork**
    ```bash
    git push origin feature/amazing-feature
    ```
6. **Open a Pull Request**

### Code Style

- Use meaningful variable names
- Add comments for complex logic
- Follow existing code patterns
- Test before submitting PR

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
