const Database = require('better-sqlite3');
const path = require('path');

// Connect to the EXISTING database
const dbPath = path.join(__dirname, '../Merchantdb/merchant.db');
const db = new Database(dbPath);

console.log("🔄 Attempting to update database schema...");

try {
    // 1. Add Phone Column
    try {
        db.prepare("ALTER TABLE merchants ADD COLUMN phone TEXT").run();
        console.log("✅ Added 'phone' column.");
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log("ℹ️ 'phone' column already exists.");
        } else {
            console.error("❌ Error adding phone:", err.message);
        }
    }

    // 2. Add Booking Fee Column
    try {
        db.prepare("ALTER TABLE merchants ADD COLUMN booking_fee REAL DEFAULT 0").run();
        console.log("✅ Added 'booking_fee' column.");
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log("ℹ️ 'booking_fee' column already exists.");
        } else {
            console.error("❌ Error adding booking_fee:", err.message);
        }
    }

    // 3. Add Staff Photos Column (just in case)
    try {
        db.prepare("ALTER TABLE staff ADD COLUMN photo_path TEXT").run();
        console.log("✅ Added 'photo_path' column to staff.");
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log("ℹ️ 'photo_path' column already exists.");
        } else {
             // Ignore error if table doesn't exist yet, init.js will catch it
            console.log("⚠️ Could not add photo_path (table might not exist yet).");
        }
    }

    console.log("🎉 Database update complete!");

} catch (error) {
    console.error("CRITICAL ERROR:", error);
}