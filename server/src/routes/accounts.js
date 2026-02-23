const express = require('express');
const router = express.Router();
const pool = require('../db');

const NOTE_DENOMS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const calcTotalFromDenominations = (denoms) => {
    return NOTE_DENOMS.reduce((sum, n) => sum + (parseInt(denoms[n] || 0) * n), 0);
};

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
    const { account_name, holder_name, balance, type, low_balance_threshold, initial_balance, denominations } = req.body;

    const isCash = ['cash', 'petty_cash'].includes(type);
    let finalBalance = parseFloat(balance || initial_balance || 0);
    let finalDenominations = denominations || {};

    // If cash type, also compute balance from denominations
    if (isCash && denominations && Object.keys(denominations).length > 0) {
        finalBalance = calcTotalFromDenominations(denominations);
        finalDenominations = denominations;
    }

    try {
        const result = await pool.query(
            `INSERT INTO accounts (account_name, holder_name, balance, type, low_balance_threshold, initial_balance, denominations)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                account_name,
                holder_name,
                finalBalance,
                type,
                low_balance_threshold || 100,
                finalBalance, // initial_balance = balance at creation
                JSON.stringify(finalDenominations)
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update account (name, holder, threshold, balance, denominations)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { account_name, holder_name, low_balance_threshold, initial_balance, balance, denominations } = req.body;

    try {
        // Get current account type
        const accRes = await pool.query('SELECT type FROM accounts WHERE id = $1', [id]);
        if (accRes.rowCount === 0) return res.status(404).json({ message: 'Account not found' });

        const isCash = ['cash', 'petty_cash'].includes(accRes.rows[0].type);

        let finalBalance = parseFloat(balance || 0);
        let finalDenominations = denominations || null;

        if (isCash && denominations) {
            finalBalance = calcTotalFromDenominations(denominations);
            finalDenominations = denominations;
        }

        let query, params;

        if (isCash && finalDenominations !== null) {
            // Update with denominations and recalculated balance
            query = `UPDATE accounts 
                     SET account_name = $1, holder_name = $2, low_balance_threshold = $3,
                         initial_balance = COALESCE($4, initial_balance),
                         balance = $5, denominations = $6
                     WHERE id = $7 RETURNING *`;
            params = [account_name, holder_name, low_balance_threshold, initial_balance || null, finalBalance, JSON.stringify(finalDenominations), id];
        } else if (!isCash && balance !== undefined) {
            // Non-cash account: update balance directly
            query = `UPDATE accounts 
                     SET account_name = $1, holder_name = $2, low_balance_threshold = $3,
                         initial_balance = COALESCE($4, initial_balance),
                         balance = $5
                     WHERE id = $6 RETURNING *`;
            params = [account_name, holder_name, low_balance_threshold, initial_balance || null, finalBalance, id];
        } else {
            // just update metadata fields
            query = `UPDATE accounts 
                     SET account_name = $1, holder_name = $2, low_balance_threshold = $3,
                         initial_balance = COALESCE($4, initial_balance)
                     WHERE id = $5 RETURNING *`;
            params = [account_name, holder_name, low_balance_threshold, initial_balance || null, id];
        }

        const result = await pool.query(query, params);
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

// Update Denominations only (for Cash accounts) - dedicated endpoint
router.post('/:id/denominations', async (req, res) => {
    const { id } = req.params;
    const { denominations } = req.body;

    const total = calcTotalFromDenominations(denominations);

    try {
        const result = await pool.query(
            'UPDATE accounts SET denominations = $1, balance = $2 WHERE id = $3 RETURNING *',
            [JSON.stringify(denominations), total, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete account (Soft Delete)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE accounts SET is_active = FALSE WHERE id = $1', [id]);
        res.json({ message: 'Account deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
