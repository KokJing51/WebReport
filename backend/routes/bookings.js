// backend/routes/bookings.js
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
// Use salon.db as the primary booking database (shared with WhatsApp bot)
const salonDb = new Database(path.join(__dirname, '../../../../salon.db'));
const merchantDb = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

// Cache for service and staff lookups to avoid repeated DB queries
const serviceCache = new Map();
const staffCache = new Map();
const customerCache = new Map();
const missingIds = { services: new Set(), staff: new Set(), customers: new Set() };

// Get all bookings for a merchant
router.get('/', (req, res) => {
  try {
    const { merchant_id, start_date, end_date, status, date } = req.query;
    
    // Use salon.db (shared with WhatsApp bot to avoid double bookings)
    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    // Filter by merchant_id if provided
    // Include both: bookings with matching merchant_id AND legacy bookings with NULL merchant_id
    if (merchant_id) {
      query += ' AND (merchant_id = ? OR merchant_id IS NULL)';
      params.push(merchant_id);
    }

    if (start_date) {
      query += ' AND DATE(start_dt) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(start_dt) <= ?';
      params.push(end_date);
    }
    
    // For single date filter (used by booking widget)
    if (date) {
      query += ' AND DATE(start_dt) = ?';
      params.push(date);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY start_dt DESC';

    const bookings = salonDb.prepare(query).all(...params);
    
    // Get service names and staff names from salon.db
    const bookingsWithDetails = bookings.map(booking => {
      let service_name = null;
      let staff_name = null;
      let merchant_service_id = null;
      let merchant_staff_id = null;
      let booking_date = null;
      let booking_time = null;
      
      if (booking.service_id) {
        // Get service name from salon.db
        try {
          const service = salonDb.prepare('SELECT name FROM services WHERE id = ?').get(booking.service_id);
          service_name = service ? service.name : null;
          
          // Get merchant service ID if this booking is for a merchant
          if (booking.merchant_id) {
            const mapping = salonDb.prepare(
              'SELECT merchant_service_id FROM service_mapping WHERE salon_service_id = ? AND merchant_id = ?'
            ).get(booking.service_id, booking.merchant_id);
            merchant_service_id = mapping ? mapping.merchant_service_id : null;
          }
        } catch (err) {
          // Service not found
        }
      }
      
      if (booking.staff_id) {
        // Get staff name from salon.db
        try {
          const staff = salonDb.prepare('SELECT name FROM staff WHERE id = ?').get(booking.staff_id);
          staff_name = staff ? staff.name : null;
          
          // Get merchant staff ID if this booking is for a merchant
          if (booking.merchant_id) {
            const mapping = salonDb.prepare(
              'SELECT merchant_staff_id FROM staff_mapping WHERE salon_staff_id = ? AND merchant_id = ?'
            ).get(booking.staff_id, booking.merchant_id);
            merchant_staff_id = mapping ? mapping.merchant_staff_id : null;
          }
        } catch (err) {
          // Staff not found
        }
      }
      
      // Extract date and time from start_dt for frontend compatibility
      if (booking.start_dt) {
        try {
          const startDate = new Date(booking.start_dt);
          if (!isNaN(startDate.getTime())) {
            // Use local date/time format
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            
            booking_date = `${year}-${month}-${day}`;
            booking_time = `${hours}:${minutes}`;
          }
        } catch (err) {
          console.error('Error parsing start_dt:', booking.start_dt, err);
        }
      }
      
      // Get customer name if available
      let customer_name = null;
      if (booking.customer_id) {
        try {
          const customer = salonDb.prepare('SELECT name FROM customers WHERE id = ?').get(booking.customer_id);
          customer_name = customer ? customer.name : null;
        } catch (err) {
          // Customer not found
        }
      }
      
      return {
        ...booking,
        service_name,
        staff_name,
        merchant_service_id,
        merchant_staff_id,
        booking_date,
        booking_time,
        customer_name,
        customer_phone: booking.phone
      };
    });
    
    res.json(bookingsWithDetails);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const booking = bookingDb.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get service name if service_id exists
    let service_name = null;
    if (booking.service_id) {
      try {
        const service = merchantDb.prepare('SELECT name FROM services WHERE id = ?').get(booking.service_id);
        service_name = service ? service.name : null;
      } catch (err) {
        // Service not found, continue without it
      }
    }

    res.json({
      ...booking,
      service_name
    });
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create booking
router.post('/', (req, res) => {
  try {
    const {
      merchant_id,
      service_id,  // This is merchant service ID
      staff_id,    // This is merchant staff ID
      customer_name,
      customer_phone,
      customer_email,
      booking_date,
      booking_time,
      party_size,
      total_price,
      notes
    } = req.body;

    if (!customer_name || !customer_phone || !booking_date || !booking_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Map merchant service/staff IDs to salon IDs
    let salon_service_id = service_id;
    let salon_staff_id = staff_id;
    
    if (merchant_id && service_id) {
      const serviceMapping = salonDb.prepare(
        'SELECT salon_service_id FROM service_mapping WHERE merchant_service_id = ? AND merchant_id = ?'
      ).get(service_id, merchant_id);
      
      if (serviceMapping) {
        salon_service_id = serviceMapping.salon_service_id;
      } else {
        console.warn(`Warning: No service mapping found for merchant_service_id=${service_id}, merchant_id=${merchant_id}`);
      }
    }
    
    if (merchant_id && staff_id) {
      const staffMapping = salonDb.prepare(
        'SELECT salon_staff_id FROM staff_mapping WHERE merchant_staff_id = ? AND merchant_id = ?'
      ).get(staff_id, merchant_id);
      
      if (staffMapping) {
        salon_staff_id = staffMapping.salon_staff_id;
      } else {
        console.warn(`Warning: No staff mapping found for merchant_staff_id=${staff_id}, merchant_id=${merchant_id}`);
      }
    }

    // Convert booking_date and booking_time to ISO timestamp for salon.db
    // Handle both 12-hour (e.g., "2:00 PM") and 24-hour (e.g., "14:00") formats
    let timeString = booking_time;
    
    // Check if time is in 12-hour format (contains AM/PM)
    if (booking_time.includes('AM') || booking_time.includes('PM')) {
      const [time, period] = booking_time.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    const bookingDateTime = new Date(`${booking_date}T${timeString}`);
    
    if (isNaN(bookingDateTime.getTime())) {
      console.error('Invalid date/time:', { booking_date, booking_time, timeString });
      return res.status(400).json({ 
        error: 'Invalid date or time format',
        details: `Could not parse date: ${booking_date} time: ${booking_time}`
      });
    }
    
    const start_dt = bookingDateTime.toISOString();
    
    // Get service duration from salon.db to calculate end_dt
    let duration_min = 30; // default
    if (salon_service_id) {
      try {
        const service = salonDb.prepare('SELECT duration_min FROM services WHERE id = ?').get(salon_service_id);
        if (service) duration_min = service.duration_min;
      } catch (err) {
        console.log('Could not get service duration, using default');
      }
    }
    
    const end_dt = new Date(bookingDateTime.getTime() + duration_min * 60000).toISOString();

    // Create or get customer_id from customers table
    let customer_id = null;
    try {
      const existingCustomer = salonDb.prepare('SELECT id FROM customers WHERE phone_e164 = ?').get(customer_phone);
      if (existingCustomer) {
        customer_id = existingCustomer.id;
        // Update name if provided
        if (customer_name) {
          salonDb.prepare('UPDATE customers SET name = ? WHERE id = ?').run(customer_name, customer_id);
        }
      } else {
        // Create new customer
        const insertCustomer = salonDb.prepare('INSERT INTO customers (phone_e164, name) VALUES (?, ?)');
        const result = insertCustomer.run(customer_phone, customer_name);
        customer_id = result.lastInsertRowid;
      }
    } catch (err) {
      console.error('Error managing customer:', err);
    }

    // Insert into salon.db (shared with WhatsApp bot)
    const salonStmt = salonDb.prepare(`
      INSERT INTO bookings (
        phone, staff_id, service_id, start_dt, end_dt, status, customer_id, merchant_id
      ) VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `);

    const salonInfo = salonStmt.run(
      customer_phone,
      salon_staff_id || null,
      salon_service_id || null,
      start_dt,
      end_dt,
      customer_id,
      merchant_id || null
    );

    // Get the created booking from salon.db
    const booking = salonDb.prepare('SELECT * FROM bookings WHERE id = ?').get(salonInfo.lastInsertRowid);
    
    // Get service name and staff name from salon.db
    let service_name = null;
    let staff_name = null;
    
    if (booking.service_id) {
      try {
        const service = salonDb.prepare('SELECT name FROM services WHERE id = ?').get(booking.service_id);
        service_name = service ? service.name : null;
      } catch (err) {
        // Service not found
      }
    }
    
    if (booking.staff_id) {
      try {
        const staff = salonDb.prepare('SELECT name FROM staff WHERE id = ?').get(booking.staff_id);
        staff_name = staff ? staff.name : null;
      } catch (err) {
        // Staff not found
      }
    }

    res.json({ 
      success: true, 
      booking: {
        ...booking,
        service_name,
        staff_name,
        customer_name,
        booking_date,
        booking_time
      }
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ error: 'Failed to create booking', details: err.message });
  }
});

// Update booking
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_name,
      customer_phone,
      customer_email,
      booking_date,
      booking_time,
      service_id,
      staff_id,
      party_size,
      total_price,
      notes,
      status
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (customer_name !== undefined) {
      updates.push('customer_name = ?');
      params.push(customer_name);
    }
    if (customer_phone !== undefined) {
      updates.push('customer_phone = ?');
      params.push(customer_phone);
    }
    if (customer_email !== undefined) {
      updates.push('customer_email = ?');
      params.push(customer_email);
    }
    if (booking_date !== undefined) {
      updates.push('booking_date = ?');
      params.push(booking_date);
    }
    if (booking_time !== undefined) {
      updates.push('booking_time = ?');
      params.push(booking_time);
    }
    if (party_size !== undefined) {
      updates.push('party_size = ?');
      params.push(party_size);
    }
    if (total_price !== undefined) {
      updates.push('total_price = ?');
      params.push(total_price);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (service_id !== undefined) {
      updates.push('service_id = ?');
      params.push(service_id);
    }
    if (staff_id !== undefined) {
      updates.push('staff_id = ?');
      params.push(staff_id);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`;
    bookingDb.prepare(query).run(...params);

    const booking = bookingDb.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    
    // Get service name and staff name if they exist
    let service_name = null;
    let staff_name = null;
    
    if (booking.service_id) {
      try {
        const service = merchantDb.prepare('SELECT name FROM services WHERE id = ?').get(booking.service_id);
        service_name = service ? service.name : null;
      } catch (err) {
        // Service not found
      }
    }
    
    if (booking.staff_id) {
      try {
        const staff = merchantDb.prepare('SELECT name FROM staff WHERE id = ?').get(booking.staff_id);
        staff_name = staff ? staff.name : null;
      } catch (err) {
        // Staff not found
      }
    }

    res.json({ 
      success: true, 
      booking: {
        ...booking,
        service_name,
        staff_name
      }
    });
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Cancel/Delete booking
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { cancel } = req.query; // If cancel=true, just mark as cancelled, otherwise delete

    if (cancel === 'true') {
      // Mark as cancelled
      bookingDb.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', id);
      res.json({ success: true, message: 'Booking cancelled' });
    } else {
      // Delete booking
      bookingDb.prepare('DELETE FROM bookings WHERE id = ?').run(id);
      res.json({ success: true, message: 'Booking deleted' });
    }
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Export bookings to CSV
router.get('/export/csv', (req, res) => {
  try {
    const { merchant_id, start_date, end_date } = req.query;

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (merchant_id) {
      query += ' AND merchant_id = ?';
      params.push(merchant_id);
    }

    if (start_date) {
      query += ' AND booking_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND booking_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY booking_date DESC, booking_time DESC';

    const bookings = bookingDb.prepare(query).all(...params);

    // Convert to CSV
    const headers = ['ID', 'Merchant ID', 'Service ID', 'Customer Name', 'Customer Phone', 'Customer Email', 'Booking Date', 'Booking Time', 'Party Size', 'Total Price', 'Status', 'Notes', 'Created At'];
    const rows = bookings.map(b => [
      b.id,
      b.merchant_id,
      b.service_id || '',
      b.customer_name,
      b.customer_phone,
      b.customer_email || '',
      b.booking_date,
      b.booking_time,
      b.party_size,
      b.total_price || '',
      b.status,
      (b.notes || '').replace(/"/g, '""'), // Escape quotes
      b.created_at
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting bookings:', err);
    res.status(500).json({ error: 'Failed to export bookings' });
  }
});

module.exports = router;

