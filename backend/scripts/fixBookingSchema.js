const Database = require('better-sqlite3');
const path = require('path');

const bookingDbPath = path.join(__dirname, '../BookingDb/bookings.db');
const db = new Database(bookingDbPath);

console.log('Fixing bookings table schema...');

db.exec(`
  DROP TABLE IF EXISTS bookings;
  
  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    service_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    party_size INTEGER DEFAULT 1,
    total_price REAL,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Bookings table schema fixed!');
db.close();

