# Deployment Files Guide

This document clearly identifies which files are deployed to production and which remain in development only.

---

## 🚀 Files to Deploy

### Railway Backend Deployment

**Upload these files/folders to Railway:**

```
backend/
├── middleware/
│   ├── adminAuth.js          ✅ DEPLOY
│   ├── errorHandler.js       ✅ DEPLOY
│   └── validateRequest.js    ✅ DEPLOY
├── migrations/                ✅ DEPLOY (entire folder)
├── routes/                    ✅ DEPLOY (entire folder)
├── knexfile.js               ✅ DEPLOY
├── package.json              ✅ DEPLOY
└── server.js                 ✅ DEPLOY

database/
└── schema.sql                ✅ DEPLOY (import via Railway MySQL)
```

**Environment Variables (set in Railway Dashboard):**
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET` (generate new secure value for production)
- `NODE_ENV=production`
- `PORT=3001`

---

### GoDaddy Frontend Deployment

**Upload ONLY the contents of the `build/` folder to GoDaddy:**

After running `npm run build` in the frontend folder, upload these files:

```
frontend/build/
├── index.html                ✅ DEPLOY
├── favicon.ico               ✅ DEPLOY
├── robots.txt                ✅ DEPLOY
├── sitemap.xml               ✅ DEPLOY
├── static/                   ✅ DEPLOY (entire folder - CSS, JS, images)
└── [all other build files]   ✅ DEPLOY
```

**Upload Location on GoDaddy:**
- Via cPanel File Manager: `/public_html/` or `/www/`
- Via FTP: Upload to root web directory

**Frontend Environment (create `.env.production` before build):**
```
REACT_APP_API_URL=https://your-railway-app.railway.app
```

---

## 🚫 Files NOT to Deploy (Development Only)

### Backend - DO NOT DEPLOY

```
backend/
├── node_modules/             ❌ DO NOT DEPLOY (Railway installs from package.json)
├── .env                      ❌ DO NOT DEPLOY (use Railway env vars instead)
├── .env.example              ❌ DO NOT DEPLOY (template only)
├── tests/                    ❌ DO NOT DEPLOY (development testing)
├── tools/                    ❌ DO NOT DEPLOY (development utilities)
├── scripts/                  ❌ DO NOT DEPLOY (development scripts)
├── cleanup_media.js          ❌ DO NOT DEPLOY (one-off maintenance script)
├── cleanup_media_more.js     ❌ DO NOT DEPLOY (one-off maintenance script)
└── frontend/                 ❌ DO NOT DEPLOY (wrong location, use main frontend/)
```

---

### Frontend - DO NOT DEPLOY

```
frontend/
├── node_modules/             ❌ DO NOT DEPLOY (GoDaddy doesn't need this)
├── src/                      ❌ DO NOT DEPLOY (source code, not compiled)
├── public/                   ❌ DO NOT DEPLOY (becomes part of build/)
├── .env                      ❌ DO NOT DEPLOY (local development only)
├── .env.development          ❌ DO NOT DEPLOY (local development only)
├── .env.production           ❌ DO NOT DEPLOY (used during build, not deployed)
├── package.json              ❌ DO NOT DEPLOY (GoDaddy doesn't run npm)
├── package-lock.json         ❌ DO NOT DEPLOY
├── eslint.config.cjs         ❌ DO NOT DEPLOY (development linting)
├── jest.config.cjs           ❌ DO NOT DEPLOY (development testing)
├── tailwind.config.js        ❌ DO NOT DEPLOY (compiled into CSS)
├── README.md                 ❌ DO NOT DEPLOY
├── scripts/                  ❌ DO NOT DEPLOY (development scripts)
└── backend/                  ❌ DO NOT DEPLOY (wrong location)
```

---

### Root Level - DO NOT DEPLOY

```
/
├── .git/                     ❌ DO NOT DEPLOY (version control only)
├── .gitignore                ❌ DO NOT DEPLOY (git configuration)
├── node_modules/             ❌ DO NOT DEPLOY
├── README.md                 ❌ DO NOT DEPLOY (optional on server)
├── eslint.config.cjs         ❌ DO NOT DEPLOY
├── eslint-report.json        ❌ DO NOT DEPLOY
├── config/                   ❌ DO NOT DEPLOY (development configuration)
├── copilot-instructions/     ❌ DO NOT DEPLOY (AI assistant docs)
├── docs/                     ❌ DO NOT DEPLOY (documentation)
├── eslint-reports/           ❌ DO NOT DEPLOY (development reports)
├── RELEASE_NOTES/            ❌ DO NOT DEPLOY (changelog)
├── scripts/                  ❌ DO NOT DEPLOY (maintenance scripts)
├── styling-instructions/     ❌ DO NOT DEPLOY (design documentation)
├── test-logs/                ❌ DO NOT DEPLOY (test output)
├── public/                   ❌ DO NOT DEPLOY (if this exists at root)
├── DEPLOYMENT_CHECKLIST.md   ❌ DO NOT DEPLOY (reference doc)
├── DEPLOYMENT_FILES.md       ❌ DO NOT DEPLOY (this file)
├── SECURITY_ACCESSIBILITY_REVIEW.md  ❌ DO NOT DEPLOY
└── SEO_TESTING_GUIDE.md      ❌ DO NOT DEPLOY
```

---

## 📦 Deployment Summary

| Platform | What to Deploy | How |
|----------|---------------|-----|
| **Railway** | Backend folder (select files only) + database schema | Auto-deploy from GitHub or manual upload |
| **GoDaddy** | Frontend `build/` folder contents only | Manual upload via cPanel or FTP |
| **Database** | `schema.sql` or migrations | Import via Railway MySQL dashboard |

---

## ⚡ Quick Deployment Commands

### Backend to Railway (via GitHub)
```bash
# Railway auto-deploys when you push to main branch
git add backend/
git commit -m "deploy: update backend for production"
git push origin main
```

### Frontend to GoDaddy
```bash
# 1. Create production build
cd frontend
npm run build

# 2. Upload frontend/build/* to GoDaddy
# Use cPanel File Manager or FTP client (FileZilla, Cyberduck)
# Upload destination: /public_html/ or /www/
```

---

## 🔒 Security Notes

1. **Never deploy `.env` files** - Use platform-specific environment variables instead
2. **Never deploy `node_modules/`** - Let the server install from package.json
3. **Never deploy `.git/`** - Exposes version history and secrets
4. **Generate new JWT_SECRET** for production (don't reuse development value)
5. **Change default admin password** after first production deployment

---

## 📝 Checklist Before Deployment

- [ ] Remove all `.env` files from deployment packages
- [ ] Set environment variables in Railway dashboard
- [ ] Run `npm run build` in frontend and verify no errors
- [ ] Test backend locally with `NODE_ENV=production`
- [ ] Update `REACT_APP_API_URL` in frontend `.env.production`
- [ ] Verify `robots.txt` and `sitemap.xml` in build folder
- [ ] Import database schema to Railway MySQL
- [ ] Test SSL certificate on GoDaddy
- [ ] Verify API endpoints work from frontend
- [ ] Check admin login after deployment
- [ ] Test file upload functionality
- [ ] Monitor Railway logs for errors
- [ ] Submit sitemap to Google Search Console

---

## 🆘 Common Deployment Issues

### Issue: "Cannot connect to database"
**Solution:** Verify Railway environment variables match your MySQL credentials

### Issue: "API requests fail with 404"
**Solution:** Check `REACT_APP_API_URL` in frontend `.env.production` before building

### Issue: "Blank page after deployment to GoDaddy"
**Solution:** Ensure you uploaded **contents** of build folder, not the build folder itself

### Issue: "Admin login doesn't work"
**Solution:** Check JWT_SECRET is set in Railway environment variables

### Issue: "File uploads fail"
**Solution:** Verify Railway persistent volume is mounted at `/app/uploads`

---

**Last Updated:** January 2025  
**Deployment Architecture:** Railway (Backend) + GoDaddy Deluxe (Frontend)  
**Total Monthly Cost:** $13 ($5 Railway + $8 GoDaddy)
