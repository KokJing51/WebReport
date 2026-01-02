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

// --- [NEW] 4. Connect to Salon DB (Main booking database) ---
// This is the main database used by the WhatsApp bot and should be used for all bookings
const salonDb = new Database(path.join(__dirname, '../../../salon.db'));
// Also keep bookingDb for backward compatibility (if needed)
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

        // Fetch all confirmed bookings for this merchant & date from salon.db
        const bookings = salonDb.prepare(`
            SELECT start_dt 
            FROM bookings 
            WHERE merchant_id = ? AND DATE(start_dt) = ? AND status != 'cancelled'
        `).all(merchant_id, date);

        // Convert ISO timestamps to time strings (HH:MM format)
        const bookedTimes = bookings.map(b => {
            const dt = new Date(b.start_dt);
            return dt.toTimeString().slice(0, 5); // "HH:MM"
        });

        res.json(bookedTimes);
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

// --- DASHBOARD STATISTICS ENDPOINTS ---

// Get dashboard statistics for a merchant
app.get('/api/dashboard/stats/:merchant_id', (req, res) => {
    try {
        const { merchant_id } = req.params;
        const today = new Date().toISOString().split('T')[0];
        
        // Note: salon.db doesn't have merchant_id, it's designed for a single salon
        // For now, we'll get ALL bookings from salon.db
        
        // Today's bookings
        const todaysBookings = salonDb.prepare(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE DATE(start_dt) = ? AND status = 'confirmed'
        `).get(today);
        
        // This week's revenue (calculate from services)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString();
        
        const weeklyBookings = salonDb.prepare(`
            SELECT b.*, s.price
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.start_dt >= ? AND b.status = 'confirmed'
        `).all(weekStartStr);
        
        const weeklyRevenue = weeklyBookings.reduce((sum, booking) => sum + (booking.price || 0), 0);
        
        // Total bookings this month
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartStr = monthStart.toISOString();
        
        const monthlyBookings = salonDb.prepare(`
            SELECT COUNT(*) as count
            FROM bookings
            WHERE start_dt >= ? AND status = 'confirmed'
        `).get(monthStartStr);
        
        // No-show rate (cancelled bookings)
        const cancelledRate = salonDb.prepare(`
            SELECT 
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as rate
            FROM bookings
            WHERE start_dt >= ?
        `).get(monthStartStr);
        
        res.json({
            todaysBookings: todaysBookings.count || 0,
            weeklyRevenue: Math.round(weeklyRevenue || 0),
            monthlyBookings: monthlyBookings.count || 0,
            noShowRate: parseFloat((cancelledRate.rate || 0).toFixed(1))
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
});

// Get bookings by time of day
app.get('/api/dashboard/bookings-by-time/:merchant_id', (req, res) => {
    try {
        const { merchant_id } = req.params;
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartStr = monthStart.toISOString();
        
        const bookingsByTime = salonDb.prepare(`
            SELECT 
                CAST(strftime('%H', start_dt) AS INTEGER) as hour,
                COUNT(*) as count
            FROM bookings
            WHERE start_dt >= ? AND status = 'confirmed'
            GROUP BY hour
            ORDER BY hour
        `).all(monthStartStr);
        
        res.json(bookingsByTime);
    } catch (err) {
        console.error('Error fetching bookings by time:', err);
        res.status(500).json({ error: "Failed to fetch bookings by time" });
    }
});

// Get top services
app.get('/api/dashboard/top-services/:merchant_id', (req, res) => {
    try {
        const { merchant_id } = req.params;
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartStr = monthStart.toISOString();
        
        const topServices = salonDb.prepare(`
            SELECT 
                s.name,
                COUNT(b.id) as bookings,
                COALESCE(SUM(s.price), 0) as revenue
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.start_dt >= ? AND b.status = 'confirmed'
            GROUP BY s.id, s.name
            ORDER BY bookings DESC
            LIMIT 5
        `).all(monthStartStr);
        
        res.json(topServices);
    } catch (err) {
        console.error('Error fetching top services:', err);
        res.status(500).json({ error: "Failed to fetch top services" });
    }
});

// Get monthly bookings trend
app.get('/api/dashboard/monthly-trend/:merchant_id', (req, res) => {
    try {
        const { merchant_id } = req.params;
        
        const monthlyTrend = salonDb.prepare(`
            SELECT 
                strftime('%Y-%m', start_dt) as month,
                COUNT(*) as count
            FROM bookings
            WHERE status = 'confirmed'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `).all();
        
        res.json(monthlyTrend.reverse());
    } catch (err) {
        console.error('Error fetching monthly trend:', err);
        res.status(500).json({ error: "Failed to fetch monthly trend" });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 Backend Server is running on http://localhost:${PORT}`);
});