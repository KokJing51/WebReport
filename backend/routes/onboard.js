const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const router = express.Router();
// Connect to the database file we created in Step 4
const db = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

// Setup image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
const createSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// CORRECTED: Added comma between objects
router.post('/submit', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover_photo', maxCount: 1 }, // <--- Comma added here
    { name: 'staff_photos', maxCount: 10 } // <--- New line for staff photos
]), (req, res) => {
    try {
        const data = JSON.parse(req.body.data);
        const userId = data.user_id; 

        // Normalize paths for Windows/Mac compatibility
        const logoPath = req.files['logo'] ? 'uploads/' + req.files['logo'][0].filename : null;
        const coverPath = req.files['cover_photo'] ? 'uploads/' + req.files['cover_photo'][0].filename : null;
        const slug = createSlug(data.name) + '-' + Date.now(); 

        const insertTransaction = db.transaction(() => {
        
        // A. Insert Merchant (Updated for Phone and Booking Fee)
        const stmtMerchant = db.prepare(`
            INSERT INTO merchants (
                slug, name, industry, address, phone, 
                logo_path, cover_photo_path, 
                about, policies_info, cancellation_policy, deposit_required, booking_fee,
                break_duration, book_ahead_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmtMerchant.run(
            slug, 
            data.name, 
            data.industry, 
            data.address, 
            data.phone, // Phone number
            logoPath, 
            coverPath,
            data.about, 
            data.policies, 
            data.cancellationPolicy, 
            data.depositRequired ? 1 : 0,
            data.bookingFeeAmount || 0, // Booking Fee
            data.breakTime, 
            data.bookAhead
        );
        
        const merchantId = info.lastInsertRowid;

        // B. Insert Services
        const stmtService = db.prepare(`
            INSERT INTO services (merchant_id, name, duration, price, description)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const service of data.services) {
            stmtService.run(merchantId, service.name, service.duration, service.price, service.description);
        }

        // C. Insert Staff (Updated for Photos)
        const stmtStaff = db.prepare(`
            INSERT INTO staff (merchant_id, name, bio, specialties, photo_path)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Get the array of uploaded staff photos (if any)
        const staffPhotos = req.files['staff_photos'] || [];

        for (const member of data.staff) {
            let photoPath = null;
            
            // Check if this member has a linked photo
            if (member.photoIndex !== undefined && member.photoIndex > -1) {
                if (staffPhotos[member.photoIndex]) {
                    photoPath = 'uploads/' + staffPhotos[member.photoIndex].filename;
                }
            }

            stmtStaff.run(
                merchantId, 
                member.name, 
                member.bio, 
                JSON.stringify(member.services || []),
                photoPath // Insert photo path
            );
        }

        // D. Insert Working Hours
        const stmtHours = db.prepare(`
            INSERT INTO working_hours (merchant_id, day_of_week, is_open, open_time, close_time)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        days.forEach(day => {
            const dayData = data.workingHours[day];
            if (dayData) {
                stmtHours.run(
                    merchantId, 
                    day, 
                    dayData.open ? 1 : 0, 
                    dayData.start, 
                    dayData.end
                );
            }
        });

        return { merchantId, slug };
    });

        const result = insertTransaction();
        
        // Update user's merchant_id
        if (userId) {
            db.prepare('UPDATE users SET merchant_id = ? WHERE id = ?').run(result.merchantId, userId);
        }
        
        res.json({ success: true, ...result });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;