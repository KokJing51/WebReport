// backend/BookingDb/init_booking.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the directory exists
const dbDir = __dirname;
if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'bookings.db');
const db = new Database(dbPath, { verbose: console.log });

const createSchema = () => {
    console.log("Creating Bookings Database Schema...");

    db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        service_id INTEGER,
        staff_id INTEGER,
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
    console.log("✅ Bookings tables created successfully.");
};

createSchema();