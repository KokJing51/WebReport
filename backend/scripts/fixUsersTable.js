// backend/scripts/fixUsersTable.js - Fix users table to remove foreign key constraint
const Database = require('better-sqlite3');
const path = require('path');

const merchantDbPath = path.join(__dirname, '../Merchantdb/merchant.db');
const db = new Database(merchantDbPath);

console.log('Fixing users table schema...');

// Drop and recreate the users table without foreign key constraint
db.exec(`
  -- Create backup of existing data
  CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
  
  -- Drop the old table
  DROP TABLE IF EXISTS users;
  
  -- Recreate without foreign key constraint
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    business_name TEXT,
    merchant_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Restore data if backup exists
  INSERT INTO users SELECT * FROM users_backup;
  DROP TABLE IF EXISTS users_backup;
`);

console.log('✅ Users table schema fixed!');
db.close();

