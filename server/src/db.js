const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback to individual vars if DATABASE_URL is not set
    ...(process.env.DATABASE_URL ? {
        ssl: {
            rejectUnauthorized: false
        }
    } : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vighnaharta_db',
        port: process.env.DB_PORT || 5432,
    })
});

module.exports = pool;
