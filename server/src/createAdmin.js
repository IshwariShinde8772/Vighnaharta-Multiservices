/**
 * createAdmin.js — Create or reset the admin user
 *
 * Usage:
 *   node src/createAdmin.js
 *     → Creates default admin (username: admin, password: password123)
 *
 *   node src/createAdmin.js myusername mysecretpassword "My Full Name"
 *     → Creates admin with custom credentials
 *
 *   node src/createAdmin.js vighnaharta shop@2025 "Vighnaharta Services"
 *     → Creates admin: username=vighnaharta, password=shop@2025
 *
 * If the admin already exists, it will UPDATE (reset) their credentials.
 */

const pool = require('./db');
const bcrypt = require('bcrypt');

async function createAdmin() {
    // Accept command-line arguments: username, password, full_name
    const args = process.argv.slice(2);
    const username = args[0] || 'admin';
    const password = args[1] || 'password123';
    const fullName = args[2] || 'System Admin';

    console.log('─────────────────────────────────────────');
    console.log('  Vighnaharta Admin Setup');
    console.log('─────────────────────────────────────────');
    console.log(`  Username  : ${username}`);
    console.log(`  Full Name : ${fullName}`);
    console.log(`  Password  : ${'*'.repeat(password.length)}`);
    console.log('─────────────────────────────────────────');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this username already exists
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

        if (existing.rows.length > 0) {
            // UPDATE existing admin credentials
            await pool.query(
                'UPDATE users SET password = $1, full_name = $2 WHERE username = $3',
                [hashedPassword, fullName, username]
            );
            console.log(`\n✅ Admin "${username}" credentials UPDATED successfully.`);
        } else {
            // Check if ANY admin exists (first-time setup vs additional admin)
            const anyAdmin = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");

            if (anyAdmin.rows.length > 0 && !args[0]) {
                // Default "admin" user doesn't exist, but another admin does.
                // Don't create duplicate — just inform.
                console.log('\n⚠️  Another admin already exists. Use Settings → Admin Access to add more admins.');
                console.log('   Or run: node src/createAdmin.js <username> <password> "<Full Name>"');
            } else {
                // Insert new admin
                await pool.query(
                    'INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4)',
                    [username, hashedPassword, 'admin', fullName]
                );
                console.log(`\n✅ Admin "${username}" created successfully.`);
            }
        }

        console.log('\n📌 Login URL: https://your-app-url.onrender.com');
        console.log(`   Username : ${username}`);
        console.log(`   Password : ${password}`);
        console.log('\n⚠️  IMPORTANT: Change the password after first login via Settings page!\n');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Failed to create/update admin:', err.message);
        process.exit(1);
    }
}

createAdmin();
