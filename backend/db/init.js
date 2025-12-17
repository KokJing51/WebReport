// backend/db/init.js - Initialize all databases
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize Merchant DB
const merchantDbPath = path.join(__dirname, '../Merchantdb/merchant.db');
const merchantDb = new Database(merchantDbPath);

// Initialize Booking DB
const bookingDbPath = path.join(__dirname, '../BookingDb/bookings.db');
const bookingDb = new Database(bookingDbPath);

// Create users table in merchant DB (for authentication)
merchantDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        business_name TEXT,
        merchant_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Update bookings table to include merchant_id relationship
bookingDb.exec(`
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

// Also ensure merchants table exists in merchant DB (for services lookup)
merchantDb.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        industry TEXT,
        address TEXT,
        phone TEXT,                     -- <--- CHANGED from timezone
        logo_path TEXT,
        cover_photo_path TEXT,
        about TEXT,
        policies_info TEXT,
        cancellation_policy TEXT,
        deposit_required INTEGER DEFAULT 0,
        booking_fee REAL DEFAULT 0,     -- <--- ADDED booking_fee
        break_duration INTEGER DEFAULT 15,
        book_ahead_days INTEGER DEFAULT 30,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        duration INTEGER,
        price REAL,
        description TEXT,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        bio TEXT,
        specialties TEXT,
        photo_path TEXT,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified INTEGER DEFAULT 0,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE
    );

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

console.log('✅ Database schemas initialized successfully');

module.exports = { merchantDb, bookingDb };
