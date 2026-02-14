const pool = require('./db');
const bcrypt = require('bcrypt');

async function createAdmin() {
    const username = 'admin';
    const password = 'password123'; // Default password
    const fullName = 'System Admin';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if admin exists
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        await pool.query(
            'INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4)',
            [username, hashedPassword, 'admin', fullName]
        );

        console.log(`Admin user created. Username: ${username}, Password: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('Failed to create admin:', err);
        process.exit(1);
    }
}

createAdmin();
