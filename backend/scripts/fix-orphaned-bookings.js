// Script to fix orphaned bookings by setting invalid service_id and staff_id to NULL
const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const salonDb = new Database(path.join(__dirname, '../../../../salon.db'));
const merchantDb = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔧 FIX ORPHANED BOOKINGS\n');
console.log('='.repeat(60));
console.log('This script will find bookings with invalid service_id or staff_id');
console.log('and set them to NULL so they don\'t cause errors.\n');

// Find orphaned bookings
const bookings = salonDb.prepare('SELECT * FROM bookings').all();
const toFix = [];

bookings.forEach(booking => {
  let needsFix = false;
  const updates = { id: booking.id, fixes: [] };
  
  if (booking.service_id) {
    const serviceExists = salonDb.prepare('SELECT id FROM services WHERE id = ?').get(booking.service_id);
    const merchantServiceExists = merchantDb.prepare('SELECT id FROM services WHERE id = ?').get(booking.service_id);
    if (!serviceExists && !merchantServiceExists) {
      needsFix = true;
      updates.fixes.push(`Set service_id ${booking.service_id} → NULL`);
      updates.service_id = null;
    }
  }
  
  if (booking.staff_id) {
    const staffExists = salonDb.prepare('SELECT id FROM staff WHERE id = ?').get(booking.staff_id);
    const merchantStaffExists = merchantDb.prepare('SELECT id FROM staff WHERE id = ?').get(booking.staff_id);
    if (!staffExists && !merchantStaffExists) {
      needsFix = true;
      updates.fixes.push(`Set staff_id ${booking.staff_id} → NULL`);
      updates.staff_id = null;
    }
  }
  
  if (needsFix) {
    toFix.push(updates);
  }
});

if (toFix.length === 0) {
  console.log('✅ No orphaned bookings found! Database is clean.\n');
  salonDb.close();
  merchantDb.close();
  rl.close();
  process.exit(0);
}

console.log(`Found ${toFix.length} bookings that need fixing:\n`);
toFix.forEach(fix => {
  console.log(`  Booking ID ${fix.id}:`);
  fix.fixes.forEach(f => console.log(`    - ${f}`));
});

console.log('\n');
rl.question('Do you want to fix these bookings? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\nFixing bookings...\n');
    
    const updateStmt = salonDb.prepare('UPDATE bookings SET service_id = ?, staff_id = ? WHERE id = ?');
    
    toFix.forEach(fix => {
      try {
        // Get current values
        const current = salonDb.prepare('SELECT service_id, staff_id FROM bookings WHERE id = ?').get(fix.id);
        
        const newServiceId = fix.service_id !== undefined ? fix.service_id : current.service_id;
        const newStaffId = fix.staff_id !== undefined ? fix.staff_id : current.staff_id;
        
        updateStmt.run(newServiceId, newStaffId, fix.id);
        console.log(`  ✅ Fixed booking ID ${fix.id}`);
      } catch (err) {
        console.log(`  ❌ Failed to fix booking ID ${fix.id}: ${err.message}`);
      }
    });
    
    console.log('\n✨ Done! Bookings have been fixed.\n');
  } else {
    console.log('\nNo changes made.\n');
  }
  
  salonDb.close();
  merchantDb.close();
  rl.close();
});


