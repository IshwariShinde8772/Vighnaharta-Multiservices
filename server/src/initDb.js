const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initDb() {
    try {
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Reading schema...');

        // Postgres pool.query can execute multiple statements if they are simple, 
        // but sometimes it's safer to just run it. pg supports multi-statement queries by default.

        console.log('Executing schema SQL...');
        await pool.query(schemaSql);

        console.log('Database initialized successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
}

initDb();
