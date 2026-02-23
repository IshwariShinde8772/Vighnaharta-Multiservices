const pool = require('./db');

async function applyUpdates() {
    try {
        console.log('Applying database updates...');

        // 1. Create Accounts Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id SERIAL PRIMARY KEY,
                account_name VARCHAR(100) NOT NULL,
                holder_name VARCHAR(100),
                balance DECIMAL(15, 2) DEFAULT 0.00,
                type VARCHAR(20) DEFAULT 'bank',
                denominations JSONB DEFAULT '{}',
                low_balance_threshold DECIMAL(10, 2) DEFAULT 100.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Accounts table check/creation done.');

        // 2. Alter Transactions Table
        // We use a safe approach: checking if column exists is hard in raw SQL without PL/pgSQL, 
        // but 'ADD COLUMN IF NOT EXISTS' is supported in Postgres 9.6+.

        const alterQueries = [
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_charges DECIMAL(10, 2) DEFAULT 0.00;`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0.00;`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS inward_account_id INT;`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outward_account_id INT;`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS inward_denominations JSONB DEFAULT '{}';`,
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outward_denominations JSONB DEFAULT '{}';`
        ];

        for (const query of alterQueries) {
            await pool.query(query);
        }
        console.log('Transactions table columns added.');

        // 3. Add initial_balance to accounts if not exists
        await pool.query(`
            ALTER TABLE accounts 
            ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15, 2) DEFAULT 0.00;
        `);

        // 4. Add is_hidden_from_account to transactions (for soft delete in Fund Bank)
        await pool.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS is_hidden_from_account BOOLEAN DEFAULT FALSE;
        `);

        // 5. Add is_active to accounts (for soft delete of Accounts)
        await pool.query(`
            ALTER TABLE accounts 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);

        // 6. Add created_by to transactions (for Admin Tracking)
        await pool.query(`
            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
        `);

        // 7. Ensure denominations JSONB column in accounts (for cash note tracking)
        await pool.query(`
            ALTER TABLE accounts ADD COLUMN IF NOT EXISTS denominations JSONB DEFAULT '{}';
        `);

        // 8. Ensure initial_balance in accounts
        await pool.query(`
            ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15, 2) DEFAULT 0.00;
        `);

        console.log('Database schema updated successfully.');

        console.log('Updates applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to apply updates:', err);
        process.exit(1);
    }
}

applyUpdates();
