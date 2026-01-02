// Script to check database integrity and show orphaned bookings
const Database = require('better-sqlite3');
const path = require('path');

const salonDb = new Database(path.join(__dirname, '../../../../salon.db'));
const merchantDb = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

console.log('\n📊 DATABASE INTEGRITY CHECK\n');
console.log('='.repeat(60));

// Check bookings
console.log('\n📅 BOOKINGS:');
const bookings = salonDb.prepare('SELECT * FROM bookings ORDER BY start_dt DESC LIMIT 10').all();
console.log(`Total bookings (showing last 10): ${bookings.length}`);

if (bookings.length > 0) {
  console.log('\nSample bookings:');
  bookings.forEach((booking, i) => {
    console.log(`\n  ${i + 1}. Booking ID: ${booking.id}`);
    console.log(`     Customer ID: ${booking.customer_id}`);
    console.log(`     Service ID: ${booking.service_id || 'N/A'}`);
    console.log(`     Staff ID: ${booking.staff_id || 'N/A'}`);
    console.log(`     Date: ${booking.start_dt}`);
    console.log(`     Status: ${booking.status}`);
  });
}

// Check services
console.log('\n\n🛎️  SERVICES:');
try {
  const salonServices = salonDb.prepare('SELECT * FROM services').all();
  console.log(`Services in salon.db: ${salonServices.length}`);
  if (salonServices.length > 0) {
    console.log('\nAvailable services in salon.db:');
    salonServices.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}`);
    });
  }
} catch (err) {
  console.log('  Error reading services from salon.db:', err.message);
}

try {
  const merchantServices = merchantDb.prepare('SELECT * FROM services').all();
  console.log(`\nServices in merchant.db: ${merchantServices.length}`);
  if (merchantServices.length > 0) {
    console.log('\nAvailable services in merchant.db:');
    merchantServices.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}`);
    });
  }
} catch (err) {
  console.log('  Error reading services from merchant.db:', err.message);
}

// Check staff
console.log('\n\n👥 STAFF:');
try {
  const salonStaff = salonDb.prepare('SELECT * FROM staff').all();
  console.log(`Staff in salon.db: ${salonStaff.length}`);
  if (salonStaff.length > 0) {
    console.log('\nAvailable staff in salon.db:');
    salonStaff.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}`);
    });
  }
} catch (err) {
  console.log('  Error reading staff from salon.db:', err.message);
}

try {
  const merchantStaff = merchantDb.prepare('SELECT * FROM staff').all();
  console.log(`\nStaff in merchant.db: ${merchantStaff.length}`);
  if (merchantStaff.length > 0) {
    console.log('\nAvailable staff in merchant.db:');
    merchantStaff.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}`);
    });
  }
} catch (err) {
  console.log('  Error reading staff from merchant.db:', err.message);
}

// Check customers
console.log('\n\n👤 CUSTOMERS:');
try {
  const customers = salonDb.prepare('SELECT * FROM customers LIMIT 10').all();
  console.log(`Customers in salon.db (showing first 10): ${customers.length}`);
  if (customers.length > 0) {
    console.log('\nSample customers:');
    customers.forEach(c => {
      console.log(`  - ID: ${c.id}, Name: ${c.name || 'N/A'}, Phone: ${c.phone_e164 || 'N/A'}`);
    });
  }
} catch (err) {
  console.log('  Error reading customers from salon.db:', err.message);
}

// Find orphaned bookings
console.log('\n\n🔍 ORPHANED BOOKINGS CHECK:');
console.log('(Bookings with service_id or staff_id that don\'t exist)\n');

const orphanedBookings = [];
bookings.forEach(booking => {
  const issues = [];
  
  if (booking.service_id) {
    const serviceExists = salonDb.prepare('SELECT id FROM services WHERE id = ?').get(booking.service_id);
    const merchantServiceExists = merchantDb.prepare('SELECT id FROM services WHERE id = ?').get(booking.service_id);
    if (!serviceExists && !merchantServiceExists) {
      issues.push(`Service ID ${booking.service_id} not found`);
    }
  }
  
  if (booking.staff_id) {
    const staffExists = salonDb.prepare('SELECT id FROM staff WHERE id = ?').get(booking.staff_id);
    const merchantStaffExists = merchantDb.prepare('SELECT id FROM staff WHERE id = ?').get(booking.staff_id);
    if (!staffExists && !merchantStaffExists) {
      issues.push(`Staff ID ${booking.staff_id} not found`);
    }
  }
  
  if (issues.length > 0) {
    orphanedBookings.push({ booking, issues });
  }
});

if (orphanedBookings.length > 0) {
  console.log(`Found ${orphanedBookings.length} bookings with missing references:\n`);
  orphanedBookings.forEach(({ booking, issues }) => {
    console.log(`  Booking ID ${booking.id}:`);
    issues.forEach(issue => console.log(`    ⚠️  ${issue}`));
  });
  
  console.log('\n💡 SUGGESTIONS:');
  console.log('  1. Add missing services and staff to your database');
  console.log('  2. Or run the cleanup script to fix orphaned bookings');
  console.log('  3. Or update bookings to use existing service/staff IDs');
} else {
  console.log('✅ No orphaned bookings found!');
}

console.log('\n' + '='.repeat(60));
console.log('\n');

salonDb.close();
merchantDb.close();


