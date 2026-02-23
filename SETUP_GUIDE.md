# 🚀 Vighnaharta Multiservices — Customer Setup Guide

## ✅ What the Customer Gets

- A **fully deployed web app** running on Render (your server)
- **Database on Supabase** (cloud, no local setup needed)
- Accessible from **any browser, any device** (mobile, tablet, PC)

---

## 🔐 Step 1: Set the Admin Username & Password

> **Do this FIRST before giving the app URL to the customer.**

### Option A — Change Inside the App (Recommended)

1. Open the app URL → Log in with default: `admin` / `password123`
2. Go to **Settings** (sidebar menu)
3. Under **"Profile Settings"** → change the **Username** to something like `vighnaharta` or `owner2025`
4. Under **"Change Password"** → set a strong personal password
5. Done! Log out and log back in with new credentials.

### Option B — Reset from Terminal (if locked out)

Open a terminal in the `server/` folder and run:

```bash
# Format:
node src/createAdmin.js <username> <password> "<Full Name>"

# Example:
node src/createAdmin.js vighnaharta shop@2025 "Vighnaharta Services"
```

This will **update** the admin credentials in the database directly.

---

## 👥 Step 2: Add More Admin Users (Optional)

If the customer has multiple staff who need to log in:

1. Log in to the app → go to **Settings**
2. Scroll to **"Admin Access Management"**
3. Fill in the staff member's **Name**, **Username**, **Password**
4. Click **"Create Admin"**

Each staff member gets their own login. You can delete them anytime.

---

## 🗄️ About the Database (Supabase)

The database is hosted on **your Supabase account** under project:
- Project ID: `optypcniqzwcbwkzgnww`
- Region: Asia South (Mumbai)

### If you want to give the customer their OWN Supabase account:

1. Ask the customer to create a free account at [supabase.com](https://supabase.com)
2. Create a new project → get the **Connection String** (Session pooler, port 5432)
3. Open `server/.env` → update `DATABASE_URL` with their connection string:
   ```
   DATABASE_URL=postgresql://postgres.<project-id>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
4. Run the database setup script:
   ```bash
   cd server
   node src/apply_updates.js
   ```
5. Create the admin user:
   ```bash
   node src/createAdmin.js <username> <password> "<Full Name>"
   ```
6. Push the updated `.env` to Render (Environment Variables section)

> ⚠️ **Never commit `.env` to GitHub!** Set environment variables directly in Render dashboard.

---

## 🌐 About Render (Hosting)

The app is deployed from your GitHub at:
`https://github.com/IshwariShinde8772/Vighnaharta-Multiservices`

### To update the app after code changes:
```bash
git add .
git commit -m "Update description"
git push
```
Render will auto-deploy after every push.

### Render Environment Variables to Set:
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase connection string |
| `JWT_SECRET` | Any long random string (e.g. `vighnaharta_secret_2025`) |
| `PORT` | `5000` |

---

## 📱 What the Customer Uses Day-to-Day

| Action | Where |
|--------|-------|
| Log in | `https://your-app-url.onrender.com` → Login page |
| Change password | Settings → Change Password |
| Change username | Settings → Profile Settings |
| Add staff login | Settings → Admin Access Management |
| View reports | Reports page |
| Add transactions | Work Enquiry page |

---

## 🆘 If the Customer Forgets Their Password

Run this from the server terminal:
```bash
cd server
node src/createAdmin.js <their-username> <new-password> "<Their Name>"
```

This resets their password without deleting any data.

---

## 📞 Support Checklist Before Handover

- [ ] Change default `admin` / `password123` to customer's preferred credentials
- [ ] Test login with new credentials
- [ ] Show customer how to change password inside Settings
- [ ] Verify Supabase database is accessible (check Render logs)
- [ ] Share the app URL with the customer
