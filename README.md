# Vighnaharta Multiservices CMS

A comprehensive Cash Management System (CMS) for multiservice centers/cyber cafes.

## Features
- **Dashboard**: Real-time profit tracking, daily income stats, and piggy bank (denomination) monitoring.
- **Work Enquiry**: Transaction engine for Services, Deposits, and Withdrawals with automatic cash calculation.
- **Piggy Bank Logic**: Tracks physical cash note-by-note (₹2000, ₹500, etc.).
- **Reports**: Transaction history with filters and CSV export.
- **Admin**: Manage multiple admin users and settings.

## Prerequisites
- Node.js (v14+)
- PostgreSQL Server

## Installation (Local Development)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Dashboard
   ```

2. **Setup Server**
   ```bash
   cd server
   npm install
   # Create .env file with your database credentials (see DEPLOY_ONLINE.md for Supabase setup)
   npm run dev
   ```

3. **Setup Client**
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Deployment
For detailed instructions on how to deploy this app online using **Render + Netlify + Supabase**, please read [DEPLOY_ONLINE.md](./DEPLOY_ONLINE.md).

## Default Login
- **Username**: `admin`
- **Password**: `password123`

## Configuration
Update `server/.env`:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=vighnaharta_db
DB_PORT=5432
JWT_SECRET=your_secret
```
