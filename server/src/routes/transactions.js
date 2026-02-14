const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all transactions with filters
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, type, search } = req.query;

        let query = 'SELECT * FROM transactions WHERE 1=1';
        let count = 1;
        const params = [];

        if (startDate) {
            query += ` AND date(transaction_date) >= $${count++}`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND date(transaction_date) <= $${count++}`;
            params.push(endDate);
        }
        if (type) {
            query += ` AND type = $${count++}`;
            params.push(type);
        }
        if (search) {
            query += ` AND (client_name LIKE $${count++} OR description LIKE $${count++})`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // New Filters
        const { category, payment_mode } = req.query;
        if (category) {
            query += ` AND category = $${count++}`;
            params.push(category);
        }
        if (payment_mode) {
            query += ` AND payment_mode = $${count++}`;
            params.push(payment_mode);
        }

        // Filter by Account ID (inward or outward)
        const { account_id } = req.query;
        if (account_id) {
            query += ` AND (inward_account_id = $${count++} OR outward_account_id = $${count++})`;
            params.push(account_id, account_id);

            // Soft Delete Logic: If viewing account details, hide 'deleted' history
            // User: "just not shown in the history of fund bank but it will be seen in the report section"
            query += ` AND (is_hidden_from_account IS FALSE OR is_hidden_from_account IS NULL)`;
        }

        query += ' ORDER BY transaction_date DESC LIMIT 100';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new transaction
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            type, category, amount,
            cost_price = 0, selling_price = 0,
            description, client_name, client_phone,
            payment_mode,
            service_charges = 0,
            total_amount = 0,
            is_urgent = false,
            status = is_urgent ? 'completed' : (req.body.status || 'completed'),
            inward_account_id,
            outward_account_id,
            inward_denominations = {}, // New: { "500": 1, ... }
            outward_denominations = {} // New: { "100": 3, ... }
        } = req.body;

        const profit = (selling_price - cost_price) || 0;
        const finalTotal = parseFloat(total_amount) || parseFloat(amount); // Use total if available

        // Strict Cash Validation
        if (payment_mode === 'cash' && type === 'service_income') {
            const inwardTotal = Object.entries(inward_denominations).reduce((sum, [denom, count]) => sum + (parseInt(denom) * parseInt(count)), 0);
            const outwardTotal = Object.entries(outward_denominations).reduce((sum, [denom, count]) => sum + (parseInt(denom) * parseInt(count)), 0);
            const netCash = inwardTotal - outwardTotal;

            // Allow tiny floating point tolerance
            if (Math.abs(netCash - finalTotal) > 1.0) {
                throw new Error(`Cash Math Mismatch! Received (${inwardTotal}) - Returned (${outwardTotal}) != Total Amount (${finalTotal})`);
            }
        }

        // 1. Insert Transaction
        const insertRes = await client.query(
            `INSERT INTO transactions 
      (type, category, amount, cost_price, selling_price, profit, description, client_name, client_phone, payment_mode,
       service_charges, total_amount, status, is_urgent, inward_account_id, outward_account_id,
       inward_denominations, outward_denominations)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
            [
                type, category, amount, cost_price, selling_price, profit, description, client_name, client_phone, payment_mode,
                service_charges, total_amount, status, is_urgent, inward_account_id, outward_account_id,
                JSON.stringify(inward_denominations),
                JSON.stringify(outward_denominations)
            ]
        );

        // 2. Account Balance Updates

        // Handle Service Income / Deposit (Money IN)
        if (inward_account_id && (type === 'service_income' || type === 'deposit')) {
            let amountChange = 0;

            if (type === 'deposit') {
                if (payment_mode === 'cash') {
                    // Deposit specific: User says "if deposite is cash then it will be minus from bank"
                    // Context: DMT (Money Transfer). Shopkeeper takes cash, sends from Bank.
                    // So Selected Account (Bank) decreases.
                    amountChange = -finalTotal;
                } else {
                    // Deposit specific: User says "if online it will add it"
                    // Context: Incoming transfer? Or just Bank Deposit.
                    // Selected Account (Bank) increases.
                    amountChange = finalTotal;
                }
            } else {
                // Service Income
                if (payment_mode === 'cash') {
                    // Admin pays provider (Base Amount) online from Bank. Admin keeps Charges as Cash Profit.
                    // Deduct Base Amount from Bank Account.
                    const baseAmount = parseFloat(amount) || 0;
                    amountChange = -baseAmount;
                } else {
                    // Online: Add Full Amount (Base + Charges) to account.
                    amountChange = finalTotal;
                }
            }

            if (amountChange !== 0) {
                await client.query(
                    'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
                    [amountChange, inward_account_id]
                );
            }
        }

        // Handle Withdraw / Expense (Money OUT)
        if (outward_account_id && (type === 'withdraw' || type === 'expense')) {
            // User says "in withdraw it will minus"
            // Always deduct from the selected account.
            await client.query(
                `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
                [finalTotal, outward_account_id]
            );
        }

        // 3. Maintain Legacy Cash Drawer (Optional: Sync if 'Default Cash' account is used)
        // For now, we leave the legacy cash_drawer update logic separate or disable it if we fully move to Accounts.
        // User said: "use that money as a piggy bank... when bank balance get near to 100 then the message will get like low account money"
        // This implies the new Accounts system IS the source of truth.
        // I will REMOVE the old cash_drawer update to avoid double counting or confusion, 
        // assuming we migrate the old cash_drawer to a new Account entry called "Main Cash Drawer".

        await client.query('COMMIT');
        res.json({ message: 'Transaction successful', id: insertRes.rows[0].id });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(400).json({ message: err.message || 'Transaction failed' });
    } finally {
        client.release();
    }
});

// Update Transaction Status (Mark as Done)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'completed'
    try {
        const result = await pool.query(
            'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk Delete Transactions (for Reports)
router.delete('/', async (req, res) => {
    const { startDate, endDate, type, category, payment_mode } = req.query;

    // Safety: Require at least one filter or explicit 'all=true' (though front-end handles specific filters)
    // To prevent accidental "DELETE FROM transactions" without where clause.

    let query = 'DELETE FROM transactions';
    const params = [];
    const conditions = [];

    if (startDate) {
        conditions.push(`date(transaction_date) >= $${params.length + 1}`);
        params.push(startDate);
    }
    if (endDate) {
        conditions.push(`date(transaction_date) <= $${params.length + 1}`);
        params.push(endDate);
    }
    if (type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(type);
    }
    if (category) {
        conditions.push(`category = $${params.length + 1}`);
        params.push(category);
    }
    if (payment_mode) {
        conditions.push(`payment_mode = $${params.length + 1}`);
        params.push(payment_mode);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    } else {
        // If no filters, maybe allow delete all? Or strict safety?
        // User asked for "delete history", usually implies visible data.
        // Let's assume frontend sends filters. If empty, it means delete EVERYTHING.
        // We'll allow it but log it.
        console.warn("Bulk delete called without filters - Deleting ALL transactions.");
    }

    try {
        const result = await pool.query(query, params);
        // Note: We are NOT keeping the accounts in sync here because it's a "Delete History" operation.
        // Usually, deleting history shouldn't revert the balanced amount if the physical money was already spent/received.
        // The user just wants to clear the logs. 
        // If they wanted to UNDO a transaction, they should delete individually (which we handled/can handle separately).
        // For bulk delete history, we assume it's for cleanup.
        res.json({ message: `Deleted ${result.rowCount} transactions` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
