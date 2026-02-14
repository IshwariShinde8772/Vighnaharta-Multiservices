-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin', -- Simulating ENUM
  full_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Drawer
CREATE TABLE IF NOT EXISTS cash_drawer (
  id SERIAL PRIMARY KEY, -- Always 1
  note_2000 INT DEFAULT 0,
  note_500 INT DEFAULT 0,
  note_200 INT DEFAULT 0,
  note_100 INT DEFAULT 0,
  note_50 INT DEFAULT 0,
  note_20 INT DEFAULT 0,
  note_10 INT DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- deposit, withdraw, service_income, expense
  category VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) DEFAULT 0.00,
  selling_price DECIMAL(10, 2) DEFAULT 0.00,
  profit DECIMAL(10, 2) DEFAULT 0.00, 
  description TEXT,
  client_name VARCHAR(100),
  client_phone VARCHAR(20),
  payment_mode VARCHAR(20) DEFAULT 'cash',
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- New Fields
  service_charges DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'pending', 'urgent'
  is_urgent BOOLEAN DEFAULT FALSE,
  inward_account_id INT,
  outward_account_id INT,

  -- Denominations (Keep these for backward compat or specific cash note tracking on transaction)
  note_2000 INT DEFAULT 0,
  note_500 INT DEFAULT 0,
  note_200 INT DEFAULT 0,
  note_100 INT DEFAULT 0,
  note_50 INT DEFAULT 0,
  note_20 INT DEFAULT 0,
  note_10 INT DEFAULT 0
);

-- Accounts Table (Piggy Bank / Fund Management)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(100) NOT NULL,
  holder_name VARCHAR(100),
  balance DECIMAL(15, 2) DEFAULT 0.00,
  initial_balance DECIMAL(15, 2) DEFAULT 0.00,
  type VARCHAR(20) DEFAULT 'bank', -- 'bank', 'cash', 'petty_cash'
  denominations JSONB DEFAULT '{}', -- Store note counts for cash accounts
  low_balance_threshold DECIMAL(10, 2) DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL UNIQUE,
  default_price DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Seed
INSERT INTO cash_drawer (id, total_amount) 
SELECT 1, 0.00 
WHERE NOT EXISTS (SELECT 1 FROM cash_drawer WHERE id = 1);
