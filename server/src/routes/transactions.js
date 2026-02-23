const express = require('express');
const router = express.Router();
const pool = require('../db');

const NOTE_DENOMS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

/**
 * Update cash account denominations after a transaction.
 * @param {object} client  - pg transaction client
 * @param {number} accountId - account to update
 * @param {object} denominations - { noteValue: count }
 * @param {'add'|'subtract'} direction - add or subtract notes from account
 */
async function updateCashDenominations(client, accountId, denominations, direction) {
    if (!accountId || !denominations || Object.keys(denominations).length === 0) return;

    const accRes = await client.query('SELECT type, denominations FROM accounts WHERE id = $1', [accountId]);
    if (accRes.rowCount === 0) return;

    const acc = accRes.rows[0];
    if (!['cash', 'petty_cash'].includes(acc.type)) return; // only cash-type accounts track notes

    const currentDenoms = acc.denominations || {};
    const newDenoms = { ...currentDenoms };

    for (const [note, count] of Object.entries(denominations)) {
        const noteNum = parseInt(note);
        const countNum = parseInt(count || 0);
        if (countNum === 0) continue;

        const existing = parseInt(newDenoms[noteNum] || newDenoms[String(noteNum)] || 0);
        newDenoms[noteNum] = direction === 'add'
            ? existing + countNum
            : Math.max(0, existing - countNum);
    }

    // Recalculate balance from denominations
    const newBalance = NOTE_DENOMS.reduce((sum, n) => sum + (parseInt(newDenoms[n] || 0) * n), 0);

    await client.query(
        'UPDATE accounts SET denominations = $1, balance = $2 WHERE id = $3',
        [JSON.stringify(newDenoms), newBalance, accountId]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/transactions — list with filters
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, type, search, category, payment_mode, account_id } = req.query;

        let query = 'SELECT * FROM transactions WHERE 1=1';
        let count = 1;
        const params = [];

        if (startDate) { query += ` AND date(transaction_date) >= $${count++}`; params.push(startDate); }
        if (endDate) { query += ` AND date(transaction_date) <= $${count++}`; params.push(endDate); }
        if (type) { query += ` AND type = $${count++}`; params.push(type); }
        if (category) { query += ` AND category = $${count++}`; params.push(category); }
        if (payment_mode) { query += ` AND payment_mode = $${count++}`; params.push(payment_mode); }

        if (search) {
            query += ` AND (client_name LIKE $${count++} OR description LIKE $${count++})`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (account_id) {
            query += ` AND (inward_account_id = $${count++} OR outward_account_id = $${count++})`;
            params.push(account_id, account_id);
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/transactions — create transaction
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            type,
            category,
            amount,
            cost_price = 0,
            selling_price = 0,
            description,
            client_name,
            client_phone,
            payment_mode,
            service_charges = 0,
            total_amount = 0,
            is_urgent = false,
            inward_account_id,
            outward_account_id,
            inward_denominations = {},
            outward_denominations = {},
            created_by = 'admin'
        } = req.body;

        // status comes from body OR falls back
        const status = req.body.status || (is_urgent ? 'completed' : 'pending');

        const profit = (parseFloat(selling_price) - parseFloat(cost_price)) || 0;
        const baseAmount = parseFloat(amount) || 0;
        const finalTotal = parseFloat(total_amount) || baseAmount;

        // ── Cash Math Validation ─────────────────────────────────────────────
        if (payment_mode === 'cash') {
            const calcIn = Object.entries(inward_denominations).reduce((s, [d, c]) => s + parseInt(d) * parseInt(c || 0), 0);
            const calcOut = Object.entries(outward_denominations).reduce((s, [d, c]) => s + parseInt(d) * parseInt(c || 0), 0);

            if (type === 'service_income') {
                // Net cash received (IN - OUT) should equal total payable
                const netCash = calcIn - calcOut;
                if (Object.keys(inward_denominations).length > 0 && Math.abs(netCash - finalTotal) > 1.0) {
                    throw new Error(`Cash Mismatch: Received ₹${calcIn} − Returned ₹${calcOut} = ₹${netCash}, expected ₹${finalTotal}`);
                }
            } else if (type === 'deposit') {
                // Net cash IN from customer = base amount (they hand over cash)
                const netCashIn = calcIn - calcOut;
                if (Object.keys(inward_denominations).length > 0 && Math.abs(netCashIn - baseAmount) > 1.0) {
                    throw new Error(`Cash Mismatch: Received ₹${calcIn} − Change ₹${calcOut} = ₹${netCashIn}, expected ₹${baseAmount}`);
                }
            } else if (type === 'withdraw') {
                // Net cash OUT to customer = base amount (we hand over cash)
                const netCashOut = calcOut - calcIn;
                if (Object.keys(outward_denominations).length > 0 && Math.abs(netCashOut - baseAmount) > 1.0) {
                    throw new Error(`Cash Mismatch: Given ₹${calcOut} − Received ₹${calcIn} = ₹${netCashOut}, expected ₹${baseAmount}`);
                }
            }
        }

        // ── 1. Insert Transaction ─────────────────────────────────────────────
        const insertRes = await client.query(
            `INSERT INTO transactions
             (type, category, amount, cost_price, selling_price, profit,
              description, client_name, client_phone, payment_mode,
              service_charges, total_amount, status, is_urgent,
              inward_account_id, outward_account_id,
              inward_denominations, outward_denominations, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
             RETURNING id`,
            [
                type, category, baseAmount, cost_price, selling_price, profit,
                description, client_name, client_phone, payment_mode,
                service_charges, finalTotal, status, is_urgent,
                inward_account_id || null, outward_account_id || null,
                JSON.stringify(inward_denominations),
                JSON.stringify(outward_denominations),
                created_by
            ]
        );

        // ── 2. Account Balance & Denomination Updates ─────────────────────────
        //
        // LOGIC TABLE:
        // ┌────────────────┬────────┬──────────────────────────────────────────────────────────┐
        // │ Type           │ Mode   │ Account Changes                                          │
        // ├────────────────┼────────┼──────────────────────────────────────────────────────────┤
        // │ service_income │ cash   │ Inward (bank/cash): -baseAmount (admin pays provider)    │
        // │                │        │ + add inward cash notes, - outward cash change            │
        // │ service_income │ online │ Inward account: +finalTotal                              │
        // ├────────────────┼────────┼──────────────────────────────────────────────────────────┤
        // │ deposit        │ cash   │ Inward (cash hand): +baseAmount (cash comes in)          │
        // │                │        │ Outward (bank):     -baseAmount (send from bank)         │
        // │                │        │ + add inward cash notes, - outward cash change            │
        // │ deposit        │ online │ Inward account: +finalTotal (money transferred in)       │
        // │                │        │ Outward account: -finalTotal (source account deducted)   │
        // ├────────────────┼────────┼──────────────────────────────────────────────────────────┤
        // │ withdraw       │ cash   │ Inward (bank/online): +baseAmount (receive online first) │
        // │                │        │ Outward (cash hand): -baseAmount (give cash out)         │
        // │                │        │ + subtract outward cash notes, + add inward change        │
        // │ withdraw       │ online │ Outward account: -finalTotal (send money online)         │
        // │                │        │ Inward account: +finalTotal (source that receives? n/a)  │
        // └────────────────┴────────┴──────────────────────────────────────────────────────────┘

        if (type === 'service_income') {
            if (inward_account_id) {
                if (payment_mode === 'cash') {
                    // Admin takes cash from customer but must pay provider from bank
                    // Deduct base amount from admin's bank/selected account
                    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [baseAmount, inward_account_id]);
                    // Update cash denominations: admin's cash hand receives customer's notes
                    await updateCashDenominations(client, inward_account_id, inward_denominations, 'add');
                    await updateCashDenominations(client, inward_account_id, outward_denominations, 'subtract');
                } else {
                    // Online: full amount added to inward account
                    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [finalTotal, inward_account_id]);
                }
            }
            if (outward_account_id) {
                // Optional outward — if admin pays provider from a separate account
                await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [baseAmount, outward_account_id]);
            }
        }

        else if (type === 'deposit') {
            if (payment_mode === 'cash') {
                // Customer gives CASH → admin deposits to BANK via system
                // Inward (Cash Hand account): receives cash notes → balance increases
                if (inward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [baseAmount, inward_account_id]);
                    await updateCashDenominations(client, inward_account_id, inward_denominations, 'add');
                    await updateCashDenominations(client, inward_account_id, outward_denominations, 'subtract'); // change given back
                }
                // Outward (Bank account): admin sends from bank → balance decreases
                if (outward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [baseAmount, outward_account_id]);
                }
            } else {
                // Online deposit: money comes IN to inward account
                if (inward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [finalTotal, inward_account_id]);
                }
                // If there's an outward account for online, deduct from it (transfer source)
                if (outward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [finalTotal, outward_account_id]);
                }
            }
        }

        else if (type === 'withdraw') {
            if (payment_mode === 'cash') {
                // Customer wants CASH → admin gives cash from Cash Hand, receives online from customer
                // Inward account (online/bank): receives payment from customer → balance increases
                if (inward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [baseAmount, inward_account_id]);
                }
                // Outward account (Cash Hand): admin gives out cash → balance decreases
                if (outward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [baseAmount, outward_account_id]);
                    await updateCashDenominations(client, outward_account_id, outward_denominations, 'subtract'); // notes given out
                    await updateCashDenominations(client, outward_account_id, inward_denominations, 'add');      // change received back
                }
            } else {
                // Online withdraw: money OUT from outward account
                if (outward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [finalTotal, outward_account_id]);
                }
                // If inward account set for online withdraw (rare), add to it
                if (inward_account_id) {
                    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [finalTotal, inward_account_id]);
                }
            }
        }

        else if (type === 'expense') {
            // Simple expense: deduct from outward account
            if (outward_account_id) {
                await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [finalTotal, outward_account_id]);
                if (payment_mode === 'cash') {
                    await updateCashDenominations(client, outward_account_id, outward_denominations, 'subtract');
                    await updateCashDenominations(client, outward_account_id, inward_denominations, 'add');
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Transaction successful', id: insertRes.rows[0].id });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', err);
        res.status(400).json({ message: err.message || 'Transaction failed' });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/transactions/:id/status — mark as done
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/transactions — bulk delete with filters
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/', async (req, res) => {
    const { startDate, endDate, type, category, payment_mode } = req.query;

    let query = 'DELETE FROM transactions';
    const params = [];
    const conditions = [];

    if (startDate) { conditions.push(`date(transaction_date) >= $${params.length + 1}`); params.push(startDate); }
    if (endDate) { conditions.push(`date(transaction_date) <= $${params.length + 1}`); params.push(endDate); }
    if (type) { conditions.push(`type = $${params.length + 1}`); params.push(type); }
    if (category) { conditions.push(`category = $${params.length + 1}`); params.push(category); }
    if (payment_mode) { conditions.push(`payment_mode = $${params.length + 1}`); params.push(payment_mode); }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    } else {
        console.warn('Bulk delete called without filters — deleting ALL transactions.');
    }

    try {
        const result = await pool.query(query, params);
        res.json({ message: `Deleted ${result.rowCount} transactions` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
