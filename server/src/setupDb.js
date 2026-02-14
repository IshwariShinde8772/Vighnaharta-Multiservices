const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupDb() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
        database: 'postgres' // Connect to default DB to create new one
    });

    try {
        await client.connect();
        console.log('Connected to generic postgres database...');

        const dbName = process.env.DB_NAME || 'vighnaharta_db';

        // Check if DB exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            // CREATE DATABASE cannot run in a transaction block, so we run it directly
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }

    } catch (err) {
        console.error('Error during database creation check:', err);
    } finally {
        await client.end();
    }
}

setupDb();
