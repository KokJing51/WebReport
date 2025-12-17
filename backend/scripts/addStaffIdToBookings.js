// backend/scripts/addStaffIdToBookings.js - Add staff_id column to bookings table
const Database = require('better-sqlite3');
const path = require('path');

const bookingDbPath = path.join(__dirname, '../BookingDb/bookings.db');
const db = new Database(bookingDbPath);

console.log('Adding staff_id column to bookings table...');

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(bookings)").all();
  const hasStaffId = tableInfo.some(col => col.name === 'staff_id');
  
  if (hasStaffId) {
    console.log('✅ staff_id column already exists');
  } else {
    // Add staff_id column
    db.exec('ALTER TABLE bookings ADD COLUMN staff_id INTEGER');
    console.log('✅ staff_id column added successfully!');
  }
} catch (error) {
  console.error('❌ Error adding staff_id column:', error.message);
}

db.close();

