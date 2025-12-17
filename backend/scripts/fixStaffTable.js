// backend/scripts/fixStaffTable.js - Create staff and working_hours tables if they don't exist
const Database = require('better-sqlite3');
const path = require('path');

const merchantDbPath = path.join(__dirname, '../Merchantdb/merchant.db');
const db = new Database(merchantDbPath);

console.log('Creating staff and working_hours tables if they don\'t exist...');

try {
  // Create staff table
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      bio TEXT,
      specialties TEXT,
      photo_path TEXT,
      FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE
    );
  `);
  
  // Create working_hours table
  db.exec(`
    CREATE TABLE IF NOT EXISTS working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      is_open INTEGER DEFAULT 1,
      open_time TEXT,
      close_time TEXT,
      FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE
    );
  `);
  
  console.log('✅ Staff and working_hours tables created successfully!');
} catch (error) {
  console.error('❌ Error creating tables:', error.message);
}

db.close();

