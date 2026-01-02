const Database = require('better-sqlite3');
const path = require('path');

// Connect to merchant database
const merchantDbPath = path.join(__dirname, '../Merchantdb/merchant.db');
const merchantDb = new Database(merchantDbPath);

console.log('\n=============================================');
console.log('POPULATING MERCHANT ID 8 (admin123)');
console.log('=============================================\n');

// Update merchant 8 with proper information
const updateMerchant = merchantDb.prepare(`
  UPDATE merchants 
  SET name = ?,
      industry = ?,
      address = ?,
      phone = ?,
      about = ?,
      policies_info = ?,
      cancellation_policy = ?,
      deposit_required = ?,
      timezone = ?
  WHERE id = 8
`);

updateMerchant.run(
  'FEIN Salon',
  'salon',
  '123 Main Street, Kuala Lumpur, Malaysia',
  '+60123456789',
  'Premium hair salon offering professional styling, coloring, and treatment services.',
  'Please arrive 10 minutes early. Late arrivals may result in shortened service time.',
  'Cancellations must be made 24 hours in advance for a full refund.',
  1, // deposit required
  'Asia/Kuala_Lumpur'
);

console.log('✅ Updated merchant information');

// Add services
const insertService = merchantDb.prepare(`
  INSERT INTO services (merchant_id, name, duration, price, description)
  VALUES (?, ?, ?, ?, ?)
`);

const services = [
  [8, 'Haircut', 30, 50, 'Professional haircut and styling'],
  [8, 'Hair Color', 60, 120, 'Full hair coloring service'],
  [8, 'Wash & Blow Dry', 20, 30, 'Hair wash and blow dry styling'],
  [8, 'Hair Treatment', 45, 80, 'Deep conditioning hair treatment']
];

// Clear existing services for merchant 8
merchantDb.prepare('DELETE FROM services WHERE merchant_id = 8').run();

services.forEach(service => {
  insertService.run(...service);
  console.log(`✅ Added service: ${service[1]}`);
});

// Add staff
const insertStaff = merchantDb.prepare(`
  INSERT INTO staff (merchant_id, name, bio, specialties)
  VALUES (?, ?, ?, ?)
`);

const staff = [
  [8, 'Aida', 'Senior hair stylist with 10 years of experience', JSON.stringify(['Haircut', 'Hair Color'])],
  [8, 'Ben', 'Expert in modern styling and treatments', JSON.stringify(['Haircut', 'Hair Treatment'])]
];

// Clear existing staff for merchant 8
merchantDb.prepare('DELETE FROM staff WHERE merchant_id = 8').run();

staff.forEach(member => {
  insertStaff.run(...member);
  console.log(`✅ Added staff: ${member[1]}`);
});

// Verify the data
console.log('\n=============================================');
console.log('VERIFICATION');
console.log('=============================================\n');

const merchant = merchantDb.prepare('SELECT * FROM merchants WHERE id = 8').get();
console.log('Merchant:', merchant.name);

const servicesCount = merchantDb.prepare('SELECT COUNT(*) as count FROM services WHERE merchant_id = 8').get();
console.log(`Services: ${servicesCount.count}`);

const staffCount = merchantDb.prepare('SELECT COUNT(*) as count FROM staff WHERE merchant_id = 8').get();
console.log(`Staff: ${staffCount.count}`);

merchantDb.close();
console.log('\n✅ Done! Merchant ID 8 is now ready for bookings.');




