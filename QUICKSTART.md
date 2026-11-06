# ⚡ Quick Start Guide

Get SAKSHAM up and running in 5 minutes!

## Step 1: Get the Code ✅

You already have it! You're in: `sih-project-with-collab-main - Copy`

## Step 2: Configure App Settings 🔑

1. Copy the example config:
    ```powershell
    Copy-Item js\config.example.js js\config.js
    ```
2. Add your public Supabase URL and anonymous key to `js/config.js`.
3. Keep `GEMINI_API_KEY` out of browser files. Set it in the server environment
   (for example, Vercel Project Settings → Environment Variables).

Gemini features require the `/api/gemini` serverless endpoint. For local AI testing,
use Vercel's local development server instead of a static HTTP server.

## Step 3: Start the Server 🚀

### Option A: Using Python (Easiest)

```bash
python -m http.server 8000
```

### Option B: Using Node.js

```bash
npx http-server -p 8000
```

### Option C: Using VS Code Live Server

1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## Step 4: Open in Browser 🌐

Navigate to: **http://localhost:8000**

## Step 5: Test the Login 👤

### As Citizen:

1. Click "Citizen Login"
2. Click "Register" tab
3. Create a new account

### As Admin:

1. Click "Admin Login"
2. Use credentials:
    - Email: `admin@city.gov`
    - Password: `admin123`

### As Staff:

1. Click "Staff Login"
2. Use credentials:
    - Email: `john.worker@city.gov`
    - Password: `worker123`

## What to Test First 🧪

### 1. Submit a Report (as Citizen)

- Click "Report Village Issue"
- Fill out the form
- Add a photo (optional)
- Click "Get Current Location"
- Submit

### 2. View Dashboard (as Admin)

- Login as admin
- See statistics
- View recent reports
- Check department workload

### 3. Update Report Status (as Admin/Staff)

- Go to "Reports Management"
- Click "View" on any report
- Change status
- Add internal notes
- Save

### 4. Try the AI Chatbot

- Click the 🤖 button (bottom right)
- Ask questions about government schemes
- Ask about the system

### 5. View the Map

- Click "Map" in navigation
- See all reports plotted
- Filter by category, status, priority
- Click markers for details

## Common Issues & Solutions 🔧

### Issue: "Failed to initialize application"

**Solution**: Check that `js/config.js` has public Supabase settings and that `GEMINI_API_KEY` is configured in the server environment for AI features

### Issue: Map not loading

**Solution**: Check internet connection (needs OpenStreetMap)

### Issue: Images not uploading

**Solution**:

- Check file size < 5MB
- Ensure it's an image file (JPG, PNG, GIF, WebP)

### Issue: Chatbot not responding

**Solution**: Check the `/api/gemini` endpoint and server-side `GEMINI_API_KEY` configuration

### Issue: Can't login

**Solution**:

- Check database is set up in Supabase
- Verify tables exist
- Check Supabase URL and anon key

## File Structure Reference 📁

```
Your Project/
├── index.html              ← Main page
├── app.js                  ← Main app logic
├── style.css               ← Main styles
├── README.md               ← Full documentation
├── IMPROVEMENTS.md         ← What we changed
├── QUICKSTART.md          ← This file!
│
├── js/                     ← JavaScript modules
│   ├── config.js          ← Public client configuration
│   ├── config.example.js  ← Template
│   ├── auth.js            ← Authentication
│   ├── validation.js      ← Form validation
│   ├── loading.js         ← Loading states
│   └── utils.js           ← Utilities
│
└── css/                    ← Additional styles
    └── loading-validation.css
```

## Next Steps 🎯

1. ✅ **Try all features** - Report submission, dashboard, map
2. ✅ **Customize** - Add your own categories and departments
3. ✅ **Deploy** - Use Netlify, Vercel, or your hosting
4. ✅ **Read** - Check `README.md` for full documentation
5. ✅ **Review** - See `IMPROVEMENTS.md` for what changed

## Tips & Tricks 💡

### Keyboard Shortcuts

- `Ctrl + Shift + I` - Open developer tools
- `Ctrl + R` - Reload page
- `F12` - Open console (check for errors here)

### Development Tips

1. Keep browser console open to see errors
2. Clear cache if styles don't update (Ctrl + Shift + R)
3. Test on different screen sizes (mobile, tablet, desktop)
4. Use "Responsive Design Mode" in browser dev tools

### Database Tips

1. Create sample data in Supabase to test with
2. Use the "Reports Management" page to see all data
3. Export reports to CSV for backup
4. Check Supabase logs if API calls fail

## Need Help? 🆘

### Check These First:

1. Browser console (F12) for JavaScript errors
2. Network tab in dev tools for API errors
3. Supabase logs for database issues
4. README.md troubleshooting section

### Still Stuck?

- Read the full README.md
- Check IMPROVEMENTS.md for technical details
- Review code comments in files
- Verify all files are in place

## Configuration Reference 🔧

### Important Config Values:

```javascript
// File upload limits
maxFileSize: 5MB

// Password requirements
passwordMinLength: 6 characters
Must have letters AND numbers

// Validation
Title: 10-255 characters
Description: 20-2000 characters
Email: valid format
Phone: 10 digits

// Session
Timeout: 24 hours
```

## Security Reminders 🔒

⚠️ **IMPORTANT for Production:**

1. Never commit `.env` files or server secrets to version control
2. **Change default passwords** in your Supabase database
3. **Use HTTPS** in production
4. **Enable Row Level Security** in Supabase
5. **Implement server-side password hashing** with bcrypt

## Feature Checklist ✅

Test these features:

- [ ] Citizen registration and login
- [ ] Staff login
- [ ] Admin login
- [ ] Report submission with photo
- [ ] Location capture
- [ ] View reports on map
- [ ] Filter reports
- [ ] Update report status (admin)
- [ ] View dashboard statistics
- [ ] Export reports to CSV
- [ ] AI chatbot
- [ ] View government schemes
- [ ] Mobile responsive design
- [ ] Dark mode (if added)

## Performance Tips ⚡

1. **Images** - Automatically compressed to 1200px width
2. **Search** - Debounced to 300ms (no lag)
3. **Loading** - All async operations show feedback
4. **Caching** - LocalStorage used for session

## Congratulations! 🎉

You now have a fully functional civic reporting system with:

- ✅ Secure authentication
- ✅ Form validation
- ✅ Loading states
- ✅ Mobile support
- ✅ Admin dashboard
- ✅ Interactive map
- ✅ AI chatbot
- ✅ Government schemes database

**Happy coding! 🚀**

---

**Questions? Check README.md for detailed documentation.**
