const Database = require('better-sqlite3');
const path = require('path');

// Connect to the Merchant Database
const dbPath = path.join(__dirname, 'Merchantdb', 'merchant.db');
const db = new Database(dbPath);

console.log("🛠️  Fixing Database: Creating 'reviews' table...");

try {
  // Create the reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified INTEGER DEFAULT 0
    );
  `);
  console.log("✅ Success! 'reviews' table has been created.");
} catch (error) {
  console.error("❌ Error creating table:", error.message);
}