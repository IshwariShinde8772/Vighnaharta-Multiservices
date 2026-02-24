const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const lowerUsername = username.toLowerCase();
        console.log(`Login attempt: ${lowerUsername}`);

        const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [lowerUsername]);

        if (result.rows.length === 0) {
            console.log(`User not found: ${lowerUsername}`);
            return res.status(401).json({ message: 'Invalid login! User not found.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log(`Password mismatch for: ${lowerUsername}`);
            return res.status(401).json({ message: 'Invalid login! Incorrect password.' });
        }

        console.log(`Login success: ${lowerUsername}`);
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

module.exports = router;
