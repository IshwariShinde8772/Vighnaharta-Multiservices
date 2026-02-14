# Deploy Online (Render + Netlify + Supabase)
=============================================

This guide explains how to deploy your **Dashboard App** online for free using the modern stack:
1.  **Database**: Supabase (PostgreSQL)
2.  **Backend**: Render (Node.js/Express)
3.  **Frontend**: Netlify (React/Vite)

## Step 1: Database Setup (Supabase)
1.  Go to **[supabase.com](https://supabase.com)** and create a free project.
2.  Go to **Project Settings > Database**.
3.  **Connection String**:
    *   Click on "Connection Pooling" (Transaction/Session Pooler).
    *   **Mode**: Session
    *   **Copy the URL**: It should look like `postgres://[user]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`.
4.  **SQL Editor**:
    *   Open `server/schema.sql` from your project.
    *   Paste its content into the Supabase SQL Editor and run it to create your tables.

## Step 2: Push Code to GitHub
1.  Create a repository on GitHub (e.g. `dashboard-app`).
2.  Push your code:
    ```bash
    git init
    git add .
    git commit -m "Ready for deploy"
    git branch -M main
    git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
    git push -u origin main
    ```

## Step 3: Backend Deployment (Render)
1.  Go to **[render.com](https://render.com)** and create a **Web Service**.
2.  Connect your GitHub repository.
3.  **Settings**:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node src/server.js`
4.  **Environment Variables**:
    *   `DATABASE_URL`: Paste your Supabase Connection Pooling URL (from Step 1).
    *   `JWT_SECRET`: `vighnaharta_secret_key_2025` (or your own secret).
    *   `PORT`: `10000` (Render default).
5.  Click **Deploy**.
6.  **Copy URL**: Once deployed, copy the service URL (e.g., `https://my-api.onrender.com`).

## Step 4: Frontend Deployment (Netlify)
1.  Go to **[netlify.com](https://netlify.com)** and "Add new site" > "Import from GitHub".
2.  Select your repository.
3.  **Build Settings**:
    *   **Base Directory**: `client`
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `client/dist` (Netlify might default to `dist`, ensure it points to the output).
4.  **Environment Variables**:
    *   `VITE_API_URL`: Paste your Render Backend URL (e.g., `https://my-api.onrender.com`).
5.  Click **Deploy**.

## Troubleshooting
- **Database Error?** Ensure you are using the **Connection Pooling URL** (port 6543) from Supabase, not the direct IPv6 one.
- **Frontend not loading data?** Check the Console (F12). If you see CORS errors, ensure your Backend (server.js) allows the Netlify domain (it currently allows all with `cors()`).

