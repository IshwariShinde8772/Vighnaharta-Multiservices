const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/authMiddleware');

// Protect all routes
router.use(authenticateToken);

// Update Profile
router.put('/profile', async (req, res) => {
    const { full_name, username } = req.body;
    const userId = req.user.id;

    try {
        await pool.query('UPDATE users SET full_name = $1, username = $2 WHERE id = $3',
            [full_name, username, userId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Change Password
router.put('/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error changing password' });
    }
});

// --- Admin Only Routes ---

// List Admins
router.get('/admins', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    try {
        const result = await pool.query('SELECT id, username, full_name, role, created_at FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Admin
router.post('/admins', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { username, password, full_name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4)',
            [username, hashedPassword, 'admin', full_name]
        );
        res.status(201).json({ message: 'Admin added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating admin' });
    }
});

// Delete Admin
router.delete('/admins/:id', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'Admin deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting admin' });
    }
});

module.exports = router;
