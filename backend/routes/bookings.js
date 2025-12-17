// backend/routes/bookings.js
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const bookingDb = new Database(path.join(__dirname, '../BookingDb/bookings.db'));
const merchantDb = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

// Get all bookings for a merchant
router.get('/', (req, res) => {
  try {
    const { merchant_id, start_date, end_date, status } = req.query;
    
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

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY booking_date DESC, booking_time DESC';

    const bookings = bookingDb.prepare(query).all(...params);
    
    // Get service names and staff names from merchant database
    const bookingsWithDetails = bookings.map(booking => {
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
      
      return {
        ...booking,
        service_name,
        staff_name
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
      service_id,
      staff_id,
      customer_name,
      customer_phone,
      customer_email,
      booking_date,
      booking_time,
      party_size,
      total_price,
      notes
    } = req.body;

    if (!merchant_id || !customer_name || !customer_phone || !booking_date || !booking_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = bookingDb.prepare(`
      INSERT INTO bookings (
        merchant_id, service_id, staff_id, customer_name, customer_phone,
        customer_email, booking_date, booking_time,
        party_size, total_price, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `);

    const info = stmt.run(
      merchant_id,
      service_id || null,
      staff_id || null,
      customer_name,
      customer_phone,
      customer_email || null,
      booking_date,
      booking_time,
      party_size || 1,
      total_price || null,
      notes || null
    );

    const booking = bookingDb.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
    
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
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking' });
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

