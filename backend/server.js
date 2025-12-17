const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3'); 
const onboardRoutes = require('./routes/onboard');
const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Serve Images Publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Initialize databases
require('./db/init');

// 2.3. Ensure staff and working_hours tables exist (migration)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('./scripts/fixStaffTable');
  } catch (error) {
    console.log('Note: Could not run staff table migration (this is okay if databases are not initialized yet)');
  }
}

// 2.5. Create test booking on startup (for development/testing)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('./scripts/seedTestBooking');
  } catch (error) {
    console.log('Note: Could not create test booking (this is okay if databases are not initialized yet)');
  }
}

// 3. API Routes
app.use('/api/onboard', onboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);

// 3. Marketplace Routes (Read - Merchant DB)
const merchantDb = new Database(path.join(__dirname, 'Merchantdb/merchant.db'));

// --- [NEW] 4. Connect to Booking DB ---
const bookingDb = new Database(path.join(__dirname, 'BookingDb/bookings.db'));
// --------------------------------------

// A. Get All Merchants
app.get('/api/merchants', (req, res) => {
    try {
        const merchants = merchantDb.prepare(`
            SELECT m.*, 
                   MIN(s.price) as min_price, 
                   MAX(s.price) as max_price,
                   (
                       SELECT json_group_array(json_object(
                           'day', day_of_week, 
                           'open', open_time, 
                           'close', close_time, 
                           'isOpen', is_open
                       ))
                       FROM working_hours wh 
                       WHERE wh.merchant_id = m.id
                   ) as hours_json
            FROM merchants m
            LEFT JOIN services s ON m.id = s.merchant_id
            GROUP BY m.id
            ORDER BY m.created_at DESC
        `).all();
        res.json(merchants);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch merchants" });
    }
});

// B. Get Single Merchant Details
// SMART ENDPOINT: Finds merchant by ID *OR* Slug
// SIMPLIFIED: Fetch ONLY by ID
app.get('/api/merchants/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Strictly find by ID
        const merchant = merchantDb.prepare('SELECT * FROM merchants WHERE id = ?').get(id);

        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        // 2. Fetch all details using that ID
        const services = merchantDb.prepare('SELECT * FROM services WHERE merchant_id = ?').all(id);
        
        // Handle staff formatting
        const staffRaw = merchantDb.prepare('SELECT * FROM staff WHERE merchant_id = ?').all(id);
        const staff = staffRaw.map(s => ({
            ...s,
            services: s.specialties ? JSON.parse(s.specialties) : [] 
        }));

        const hours = merchantDb.prepare('SELECT * FROM working_hours WHERE merchant_id = ?').all(id);
        
        // Handle reviews safely
        let reviews = [];
        try {
            reviews = merchantDb.prepare('SELECT * FROM reviews WHERE merchant_id = ? ORDER BY date DESC').all(id);
        } catch (e) {
            console.log("No reviews table yet");
        }

        res.json({
            ...merchant,
            services,
            staff,
            hours,
            reviews
        });

    } catch (err) {
        console.error("Error fetching merchant:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Services for a Merchant (by merchant_id)
app.get('/api/merchants/:merchant_id/services', (req, res) => {
    try {
        const merchant_id = req.params.merchant_id;
        const services = merchantDb.prepare('SELECT * FROM services WHERE merchant_id = ?').all(merchant_id);
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch services" });
    }
});

// Get Staff for a Merchant (by merchant_id)
app.get('/api/merchants/:merchant_id/staff', (req, res) => {
    try {
        const merchant_id = req.params.merchant_id;
        const staff = merchantDb.prepare('SELECT * FROM staff WHERE merchant_id = ?').all(merchant_id);
        const cleanedStaff = staff.map(s => ({
            ...s,
            specialties: s.specialties ? JSON.parse(s.specialties) : []
        }));
        res.json(cleanedStaff);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch staff" });
    }
});

// --- [NEW] D. Get Booked Slots Endpoint (for marketplace) ---
app.get('/api/booked-slots', (req, res) => {
    try {
        const { merchant_id, date } = req.query;
        if (!merchant_id || !date) {
            return res.status(400).json({ error: "Missing merchant_id or date" });
        }

        // Fetch all confirmed bookings for this merchant & date
        const bookings = bookingDb.prepare(`
            SELECT booking_time 
            FROM bookings 
            WHERE merchant_id = ? AND booking_date = ? AND status != 'cancelled'
        `).all(merchant_id, date);

        // Return array of times, e.g. ["2:00 PM", "4:30 PM"]
        res.json(bookings.map(b => b.booking_time));
    } catch (err) {
        console.error("Error fetching booked slots:", err);
        res.status(500).json({ error: "Failed to fetch booked slots" });
    }
});

// Post a new review
app.post('/api/reviews', (req, res) => {
    try {
        const { merchant_id, customer_name, rating, comment } = req.body;
        
        const stmt = merchantDb.prepare(`
            INSERT INTO reviews (merchant_id, customer_name, rating, comment, date)
            VALUES (?, ?, ?, ?, datetime('now'))
        `);
        
        const info = stmt.run(merchant_id, customer_name, rating, comment);
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit review" });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 Backend Server is running on http://localhost:${PORT}`);
});