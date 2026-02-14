const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all services
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY service_name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new service
router.post('/', async (req, res) => {
    const { service_name, default_price } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO services (service_name, default_price) VALUES ($1, $2) RETURNING *',
            [service_name, default_price || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Service name already exists' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete service
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM services WHERE id = $1', [id]);
        res.json({ message: 'Service deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
