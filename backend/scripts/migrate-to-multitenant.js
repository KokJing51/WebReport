// Migration script to make salon.db multi-tenant and sync data from merchant.db
const Database = require('better-sqlite3');
const path = require('path');

const salonDb = new Database(path.join(__dirname, '../../../../salon.db'));
const merchantDb = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

console.log('🔧 Starting multi-tenant migration...\n');

// Step 1: Add merchant_id columns to salon.db tables
console.log('Step 1: Adding merchant_id columns...');

try {
  // Check if merchant_id already exists in services
  const servicesColumns = salonDb.prepare('PRAGMA table_info(services)').all();
  if (!servicesColumns.find(col => col.name === 'merchant_id')) {
    salonDb.prepare('ALTER TABLE services ADD COLUMN merchant_id INTEGER').run();
    console.log('✅ Added merchant_id to services table');
  } else {
    console.log('ℹ️  merchant_id already exists in services table');
  }
} catch (err) {
  console.log('ℹ️  merchant_id column already exists or error:', err.message);
}

try {
  // Check if merchant_id already exists in staff
  const staffColumns = salonDb.prepare('PRAGMA table_info(staff)').all();
  if (!staffColumns.find(col => col.name === 'merchant_id')) {
    salonDb.prepare('ALTER TABLE staff ADD COLUMN merchant_id INTEGER').run();
    console.log('✅ Added merchant_id to staff table');
  } else {
    console.log('ℹ️  merchant_id already exists in staff table');
  }
} catch (err) {
  console.log('ℹ️  merchant_id column already exists or error:', err.message);
}

try {
  // Check if merchant_id already exists in bookings
  const bookingsColumns = salonDb.prepare('PRAGMA table_info(bookings)').all();
  if (!bookingsColumns.find(col => col.name === 'merchant_id')) {
    salonDb.prepare('ALTER TABLE bookings ADD COLUMN merchant_id INTEGER').run();
    console.log('✅ Added merchant_id to bookings table');
  } else {
    console.log('ℹ️  merchant_id already exists in bookings table');
  }
} catch (err) {
  console.log('ℹ️  merchant_id column already exists or error:', err.message);
}

// Step 2: Create mapping tables to track merchant.db IDs to salon.db IDs
console.log('\nStep 2: Creating mapping tables...');

salonDb.exec(`
  CREATE TABLE IF NOT EXISTS service_mapping (
    merchant_service_id INTEGER PRIMARY KEY,
    salon_service_id INTEGER NOT NULL,
    merchant_id INTEGER NOT NULL,
    FOREIGN KEY (salon_service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS staff_mapping (
    merchant_staff_id INTEGER PRIMARY KEY,
    salon_staff_id INTEGER NOT NULL,
    merchant_id INTEGER NOT NULL,
    FOREIGN KEY (salon_staff_id) REFERENCES staff(id)
  );
`);

console.log('✅ Created mapping tables');

// Step 3: Sync services from merchant.db to salon.db
console.log('\nStep 3: Syncing services from merchant.db...');

const merchantServices = merchantDb.prepare('SELECT * FROM services').all();
let servicesSynced = 0;

for (const merchantService of merchantServices) {
  // Check if this service already exists in mapping
  const existingMapping = salonDb.prepare(
    'SELECT * FROM service_mapping WHERE merchant_service_id = ?'
  ).get(merchantService.id);

  if (!existingMapping) {
    // Check if similar service exists in salon.db for this merchant
    const salonService = salonDb.prepare(
      'SELECT * FROM services WHERE name = ? AND merchant_id = ?'
    ).get(merchantService.name, merchantService.merchant_id);

    let salonServiceId;

    if (salonService) {
      salonServiceId = salonService.id;
    } else {
      // Insert new service into salon.db (use OR IGNORE to handle unique constraint)
      try {
        const result = salonDb.prepare(`
          INSERT INTO services (name, duration_min, price, active, merchant_id)
          VALUES (?, ?, ?, 1, ?)
        `).run(
          merchantService.name,
          merchantService.duration || 30,
          merchantService.price || 0,
          merchantService.merchant_id
        );
        salonServiceId = result.lastInsertRowid;
      } catch (err) {
        // If service name already exists (UNIQUE constraint), find it
        const existingService = salonDb.prepare(
          'SELECT * FROM services WHERE name = ?'
        ).get(merchantService.name);
        
        if (existingService) {
          // Update it with merchant_id
          salonDb.prepare('UPDATE services SET merchant_id = ? WHERE id = ?')
            .run(merchantService.merchant_id, existingService.id);
          salonServiceId = existingService.id;
        } else {
          throw err;
        }
      }
    }

    // Create mapping
    salonDb.prepare(`
      INSERT INTO service_mapping (merchant_service_id, salon_service_id, merchant_id)
      VALUES (?, ?, ?)
    `).run(merchantService.id, salonServiceId, merchantService.merchant_id);

    servicesSynced++;
  }
}

console.log(`✅ Synced ${servicesSynced} services`);

// Step 4: Sync staff from merchant.db to salon.db
console.log('\nStep 4: Syncing staff from merchant.db...');

const merchantStaff = merchantDb.prepare('SELECT * FROM staff').all();
let staffSynced = 0;

for (const merchantStaffMember of merchantStaff) {
  // Check if this staff member already exists in mapping
  const existingMapping = salonDb.prepare(
    'SELECT * FROM staff_mapping WHERE merchant_staff_id = ?'
  ).get(merchantStaffMember.id);

  if (!existingMapping) {
    // Check if similar staff exists in salon.db for this merchant
    const salonStaffMember = salonDb.prepare(
      'SELECT * FROM staff WHERE name = ? AND merchant_id = ?'
    ).get(merchantStaffMember.name, merchantStaffMember.merchant_id);

    let salonStaffId;

    if (salonStaffMember) {
      salonStaffId = salonStaffMember.id;
    } else {
      // Insert new staff into salon.db
      try {
        const result = salonDb.prepare(`
          INSERT INTO staff (name, active, merchant_id)
          VALUES (?, 1, ?)
        `).run(merchantStaffMember.name, merchantStaffMember.merchant_id);
        salonStaffId = result.lastInsertRowid;
      } catch (err) {
        // If staff name already exists (UNIQUE constraint), find it
        const existingStaff = salonDb.prepare(
          'SELECT * FROM staff WHERE name = ?'
        ).get(merchantStaffMember.name);
        
        if (existingStaff) {
          // Update it with merchant_id
          salonDb.prepare('UPDATE staff SET merchant_id = ? WHERE id = ?')
            .run(merchantStaffMember.merchant_id, existingStaff.id);
          salonStaffId = existingStaff.id;
        } else {
          throw err;
        }
      }
    }

    // Create mapping
    salonDb.prepare(`
      INSERT INTO staff_mapping (merchant_staff_id, salon_staff_id, merchant_id)
      VALUES (?, ?, ?)
    `).run(merchantStaffMember.id, salonStaffId, merchantStaffMember.merchant_id);

    staffSynced++;
  }
}

console.log(`✅ Synced ${staffSynced} staff members`);

// Step 5: Verify mapping
console.log('\nStep 5: Verifying mappings...');

const serviceMappingCount = salonDb.prepare('SELECT COUNT(*) as count FROM service_mapping').get().count;
const staffMappingCount = salonDb.prepare('SELECT COUNT(*) as count FROM staff_mapping').get().count;

console.log(`✅ Service mappings: ${serviceMappingCount}`);
console.log(`✅ Staff mappings: ${staffMappingCount}`);

console.log('\n🎉 Migration completed successfully!');

salonDb.close();
merchantDb.close();

