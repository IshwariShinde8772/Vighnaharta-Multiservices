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

## Installation

1. **Database Setup**
   - Ensure PostgreSQL is running.
   - Create a database named `vighnaharta_db`.
   - Update `server/.env` with your Postgres credentials (DB_USER, DB_PASSWORD).
   - Run the initialization script: `node server/src/initDb.js`.

2. **Backend Setup**
   ```bash
   cd server
   npm install
   # Create initial admin
   node src/createAdmin.js
   # Start server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   # Start client
   npm run dev
   ```

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
