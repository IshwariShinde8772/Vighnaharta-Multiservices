# Deploy to Vercel (Online)
===========================

To host this on Vercel with your domain, you need 2 things:
1. **GitHub Account:** To store your code.
2. **Neon.tech Account:** For your Database (Postgres).
3. **Vercel Account:** For hosting.

## STEP 1: Setup Cloud Database (Neon)
1. Go to **[neon.tech](https://neon.tech)** and create a free account.
2. Create a Project named `Vighnaharta`.
3. It will give you a **Connection String** (e.g. `postgres://user:pass@ep-rest-123.aws.neon.tech/neondb...`).
   **SAVE THIS STRING!** You will need it.
4. Go to the SQL Editor in Neon and paste the contents of `server/schema.sql` to create your tables in the cloud.

## STEP 2: Push Code to GitHub
1. Create a repository on GitHub (e.g. `dashboard-app`).
2. Upload all files from this folder to GitHub.
   (Use `git init`, `git add .`, `git commit -m "initial"`, `git branch -M main`, `git remote add origin ...`, `git push -u origin main`).

## STEP 3: Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)** and login with GitHub.
2. Click **"Add New..."** -> **Project**.
3. Import your `dashboard-app` repository.
4. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `client` (Click Edit regarding "Root Directory" and select `client` folder).
   - *Wait!* Actually, keep Root Directory as `./` (Main folder). Vercel will auto-detect settings from `vercel.json` if we set it up correctly. 
   - **Environment Variables:** Add the following:
     - `DATABASE_URL`: Your Neon Connection String from Step 1.
     - `JWT_SECRET`: `vighnaharta_secret_key_2025` (or any secret).

5. Click **Deploy**.

## Troubleshooting
- If Vercel build fails for `client`, ensure `npm install` runs in `client` folder.
- If Database connection fails, double check the `DATABASE_URL` in Vercel settings under **Settings > Environment Variables**.

## Connecting Domain
1. Once deployed, go to **Settings > Domains**.
2. Add your domain (e.g. `mydashboard.com`).
3. Follow the DNS instructions (usually adding an A record or CNAME).
