const pool = require('./src/db');

async function listUsers() {
    try {
        const res = await pool.query('SELECT username, role, full_name FROM users');
        console.log('USERS_START');
        console.log(JSON.stringify(res.rows, null, 2));
        console.log('USERS_END');
    } catch (err) {
        console.error('Error fetching users:', err.message);
    } finally {
        process.exit(0);
    }
}

listUsers();
