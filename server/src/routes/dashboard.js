const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        // 1. Cash Drawer (Legacy / Piggy Bank) Status - fetching from Accounts now preferred
        const drawerRes = await pool.query('SELECT * FROM cash_drawer WHERE id = 1');

        // Fetch All Accounts (Active Only)
        const accountRes = await pool.query('SELECT * FROM accounts WHERE is_active = TRUE ORDER BY account_name');

        // 2. Today's Stats
        const today = new Date().toISOString().split('T')[0];

        // Total Income Today
        const incomeRes = await pool.query(
            `SELECT SUM(amount) as total FROM transactions 
       WHERE type IN ('service_income') 
       AND date(transaction_date) = $1`,
            [today]
        );

        // Total Clients Today
        const clientRes = await pool.query(
            `SELECT COUNT(DISTINCT client_name) as count FROM transactions 
       WHERE date(transaction_date) = $1`,
            [today]
        );

        // Real-time Profit (Today)
        const profitRes = await pool.query(
            `SELECT SUM(profit) as profit FROM transactions 
       WHERE type = 'service_income' 
       AND date(transaction_date) = $1`,
            [today]
        );

        // Pending Work Count
        const pendingRes = await pool.query(
            `SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'`
        );

        // Pending Work Breakdown
        const pendingBreakdownRes = await pool.query(
            `SELECT category, COUNT(*) as count FROM transactions 
             WHERE status = 'pending' 
             GROUP BY category 
             ORDER BY count DESC`
        );

        // Last 7 Days Income
        const chartRes = await pool.query(
            `SELECT date(transaction_date) as date, SUM(amount) as income 
       FROM transactions 
       WHERE type = 'service_income' 
       AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY date(transaction_date)
       ORDER BY date(transaction_date)`
        );

        // Total Expenses Today
        const expenseRes = await pool.query(
            `SELECT SUM(amount) as total FROM transactions 
             WHERE type = 'expense' 
             AND date(transaction_date) = $1`,
            [today]
        );

        // [NEW] Cash Denominations Aggregation (Today)
        const cashTransactionsRes = await pool.query(
            `SELECT inward_denominations, outward_denominations 
             FROM transactions 
             WHERE date(transaction_date) = $1`,
            [today]
        );

        let inwardCashDetails = {};
        let outwardCashDetails = {};
        let totalInwardCash = 0;
        let totalOutwardCash = 0;

        cashTransactionsRes.rows.forEach(tx => {
            const inDenoms = tx.inward_denominations || {};
            const outDenoms = tx.outward_denominations || {};

            // Aggregate Inward
            Object.entries(inDenoms).forEach(([denom, count]) => {
                inwardCashDetails[denom] = (inwardCashDetails[denom] || 0) + parseInt(count || 0);
                totalInwardCash += parseInt(denom) * parseInt(count || 0);
            });

            // Aggregate Outward
            Object.entries(outDenoms).forEach(([denom, count]) => {
                outwardCashDetails[denom] = (outwardCashDetails[denom] || 0) + parseInt(count || 0);
                totalOutwardCash += parseInt(denom) * parseInt(count || 0);
            });
        });

        // Calculate Total Cash In Hand (Sum of all 'cash' type accounts)
        const cashAccounts = accountRes.rows.filter(acc => acc.type === 'cash' || acc.type === 'petty_cash');
        const totalCashInHand = cashAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

        // Calculate Total Cash Note Counts (Current Inventory)
        let totalCashCounts = {};
        let totalNotesCount = 0;
        cashAccounts.forEach(acc => {
            const denoms = acc.denominations || {};
            Object.entries(denoms).forEach(([d, c]) => {
                totalCashCounts[d] = (totalCashCounts[d] || 0) + parseInt(c);
                totalNotesCount += parseInt(c);
            });
        });


        // Fix potential float issues or strings from PG
        const parseNum = (val) => parseFloat(val) || 0;

        // User Logic for Profit: "amount of all charge... minus of outword cash..."
        // Interpretation: Total Profit (from services) - Total Expenses
        const serviceProfit = parseNum(profitRes.rows[0].profit);
        const totalExpenses = parseNum(expenseRes.rows[0].total);
        const netProfit = serviceProfit - totalExpenses;

        res.json({
            cashDrawer: drawerRes.rows[0] || {},
            accounts: accountRes.rows,
            stats: {
                todayIncome: parseNum(incomeRes.rows[0].total),
                todayClients: parseInt(clientRes.rows[0].count) || 0,
                todayProfit: netProfit, // Updated Logic
                pendingWork: parseInt(pendingRes.rows[0].count) || 0,
                pendingBreakdown: pendingBreakdownRes.rows
            },
            cashStats: {
                totalCashInHand,
                totalNotesCount, // [NEW] Total Count of Notes
                totalCashCounts, // [NEW] Detail counts 
                todayInward: {
                    total: totalInwardCash,
                    denominations: inwardCashDetails
                },
                todayOutward: {
                    total: totalOutwardCash,
                    denominations: outwardCashDetails
                }
            },
            chartData: chartRes.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
