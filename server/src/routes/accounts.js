const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all accounts
// Get all accounts (Active only)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM accounts WHERE is_active = TRUE ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new account
router.post('/', async (req, res) => {
    const { account_name, holder_name, balance, type, low_balance_threshold, initial_balance } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO accounts (account_name, holder_name, balance, type, low_balance_threshold, initial_balance) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [account_name, holder_name, balance || 0, type, low_balance_threshold || 100, initial_balance || balance || 0]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update account (generic)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { account_name, holder_name, low_balance_threshold, initial_balance } = req.body;
    try {
        const result = await pool.query(
            'UPDATE accounts SET account_name = $1, holder_name = $2, low_balance_threshold = $3, initial_balance = COALESCE($4, initial_balance) WHERE id = $5 RETURNING *',
            [account_name, holder_name, low_balance_threshold, initial_balance, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Clear Account History (Soft Delete - Hide from Account View, Keep for Reports)
router.delete('/:id/transactions', async (req, res) => {
    const { id } = req.params;
    try {
        // User Request: "just not shown in the history of fund bank but it will be seen in the report section"
        await pool.query(
            'UPDATE transactions SET is_hidden_from_account = TRUE WHERE inward_account_id = $1 OR outward_account_id = $1',
            [id]
        );
        res.json({ message: 'Account history cleared (archived for reports)' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Denominations (for Cash accounts)
router.post('/:id/denominations', async (req, res) => {
    const { id } = req.params;
    const { denominations } = req.body;

    // Validate total
    let total = 0;
    Object.entries(denominations).forEach(([note, count]) => {
        total += parseInt(note) * parseInt(count);
    });

    try {
        // Update both denominations and balance
        const result = await pool.query(
            'UPDATE accounts SET denominations = $1, balance = $2 WHERE id = $3 RETURNING *',
            [denominations, total, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



// ... (other routes remain same)

// Delete account (Soft Delete)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Soft delete: Mark as inactive so history is preserved in reports
        await pool.query('UPDATE accounts SET is_active = FALSE WHERE id = $1', [id]);
        res.json({ message: 'Account deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
