const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const pool = require('./db');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/accounts');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/services', require('./routes/services'));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Database Connection Check
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL Database');
        client.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// Catch-all handler for React Routing (Must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Conditional Listen (Runs only if executed directly, not when imported by Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export app for Vercel Serverless
module.exports = app;
