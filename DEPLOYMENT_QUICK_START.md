# 🚀 Deployment Quick Start Guide

**For:** Thunder Road Bar & Grill React Application  
**Last Updated:** January 2025  
**Estimated Time:** 30-45 minutes  

---

## 📚 Documentation Overview

This project includes comprehensive deployment documentation:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **DEPLOYMENT_QUICK_START.md** (this file) | Quick reference for experienced developers | Fast deployment without detailed explanations |
| **DEPLOYMENT_CHECKLIST.md** | Complete step-by-step deployment guide | First-time deployment or detailed walkthrough |
| **DEPLOYMENT_FILES.md** | Lists what to deploy vs what to keep local | When unsure which files go where |
| **SECURITY_ACCESSIBILITY_REVIEW.md** | Security and accessibility audit results | Pre-deployment security verification |
| **SEO_TESTING_GUIDE.md** | Post-deployment SEO testing procedures | After deployment to verify SEO tools |

---

## ⚡ Quick Deployment (TL;DR)

### Prerequisites
- GoDaddy Deluxe hosting account ($8/month)
- Railway.app account ($5/month)
- GitHub repository connected

### 3-Step Deployment

#### 1️⃣ Deploy Backend to Railway (10 minutes)
```bash
# 1. Create Railway project from GitHub repo
# 2. Add MySQL database service
# 3. Set environment variables:
NODE_ENV=production
JWT_SECRET=<generate-strong-32-char-secret>
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
FRONTEND_URL=https://your-domain.com

# 4. Add volume for uploads: /app/backend/uploads
# 5. Import database via Railway MySQL client
# 6. Get Railway URL: https://your-app.railway.app
```

#### 2️⃣ Build & Deploy Frontend to GoDaddy (15 minutes)
```bash
# 1. Create .env.production
echo "REACT_APP_API_BASE=https://your-railway-url.railway.app/api" > frontend/.env.production

# 2. Build
cd frontend
npm run build

# 3. Upload build/* to GoDaddy public_html/ via cPanel or FTP
# 4. Add .htaccess for React Router (see DEPLOYMENT_FILES.md)
```

#### 3️⃣ Configure & Test (10 minutes)
```bash
# 1. Enable SSL in GoDaddy cPanel
# 2. Test: https://your-domain.com
# 3. Test admin login: https://your-domain.com/admin
# 4. Verify forms work (contact, reservations, jobs)
```

✅ **Done!** Your site is live.

---

## 📂 What Files to Deploy?

**See DEPLOYMENT_FILES.md for complete details.**

### Railway Backend (deploy these)
```
backend/
├── middleware/       ✅
├── migrations/       ✅
├── routes/           ✅
├── knexfile.js      ✅
├── package.json     ✅
└── server.js        ✅
```

### GoDaddy Frontend (deploy build folder only)
```
frontend/build/*      ✅ Upload ALL contents
```

### DO NOT Deploy
```
node_modules/         ❌
.env                  ❌
.git/                 ❌
tests/                ❌
docs/                 ❌
*.md files            ❌
```

---

## 🔧 Environment Variables Reference

### Railway Backend
```bash
NODE_ENV=production
PORT=${{PORT}}
JWT_SECRET=<32-char-random-string>
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
FRONTEND_URL=https://trbgmidway.com,https://www.trbgmidway.com
TRUST_PROXY=true
FORCE_HTTPS=true
ALLOW_DEV_ADMIN_HEADER=0
```

### Frontend .env.production
```bash
REACT_APP_API_BASE=https://your-railway-url.railway.app/api
```

---

## ⚠️ Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| **Blank page on GoDaddy** | Check `.htaccess` exists with React Router rules |
| **CORS errors** | Verify `FRONTEND_URL` in Railway matches your domain exactly |
| **API 404 errors** | Check `REACT_APP_API_BASE` in frontend `.env.production` |
| **Admin login fails** | Verify `JWT_SECRET` is set in Railway environment variables |
| **Images not loading** | Ensure Railway volume mounted at `/app/backend/uploads` |
| **SSL not working** | Run AutoSSL in GoDaddy cPanel → SSL/TLS Status |

---

## 📝 Post-Deployment Checklist

- [ ] Site loads over HTTPS
- [ ] Admin login works
- [ ] All forms submit successfully (contact, reservations, jobs)
- [ ] Images display correctly
- [ ] Menu items load from database
- [ ] Site settings display correctly
- [ ] No console errors in browser (F12)
- [ ] No CORS errors
- [ ] Test on mobile and desktop
- [ ] Submit sitemap to Google Search Console

---

## 🔄 Deploying Updates

### Backend Updates (Auto-Deploy)
```bash
git add backend/
git commit -m "feat: update backend feature"
git push origin main
# Railway automatically deploys
```

### Frontend Updates
```bash
cd frontend
npm run build
# Upload build/* to GoDaddy via cPanel or FTP
```

### Database Updates
```bash
# Add migration file
# Push to Git
git add backend/migrations/
git commit -m "feat: add database migration"
git push
# Railway runs migration automatically
```

---

## 📞 Support

- **Railway:** https://discord.gg/railway or team@railway.app
- **GoDaddy:** 480-505-8877 (24/7) or chat support
- **Full Documentation:** See DEPLOYMENT_CHECKLIST.md

---

## 💰 Monthly Costs

| Service | Cost |
|---------|------|
| Railway (Backend + DB) | $5 |
| GoDaddy Deluxe | $8 |
| **Total** | **$13/month** |

---

## 🎯 Quick Commands Reference

```bash
# Generate JWT Secret
openssl rand -base64 32

# Build frontend
cd frontend && npm run build

# Test build locally
npx serve -s build

# Export database
mysqldump -h host -u user -p dbname > backup.sql

# Import to Railway
mysql -h railway-host -u user -p dbname < backup.sql

# Railway CLI
railway login
railway link
railway logs
railway connect mysql

# Git deployment
git add .
git commit -m "deploy: production update"
git push origin main
```

---

**🎉 Need more details?** See **DEPLOYMENT_CHECKLIST.md** for comprehensive step-by-step instructions.

**🔒 Security concerns?** Review **SECURITY_ACCESSIBILITY_REVIEW.md** for full audit results.

**📂 Unsure what to deploy?** Check **DEPLOYMENT_FILES.md** for complete file lists.
