// backend/routes/auth.js
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const merchantDb = new Database(path.join(__dirname, '../Merchantdb/merchant.db'));

// Simple password hashing (for production, use bcrypt)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Sign Up
router.post('/signup', (req, res) => {
  try {
    const { email, password, business_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = merchantDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Insert user with NULL merchant_id first (to avoid foreign key constraint)
    const info = merchantDb.prepare(`
      INSERT INTO users (email, password, business_name, merchant_id)
      VALUES (?, ?, ?, NULL)
    `).run(email, hashedPassword, business_name || null);
    
    // Update merchant_id to match user id (after user is created)
    const newUserId = info.lastInsertRowid;
    merchantDb.prepare('UPDATE users SET merchant_id = ? WHERE id = ?').run(newUserId, newUserId);
    
    // Get the created user (without password)
    const user = merchantDb.prepare('SELECT id, email, business_name, merchant_id FROM users WHERE id = ?').get(newUserId);

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name,
        merchant_id: user.merchant_id || user.id
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = merchantDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If merchant_id is null, set it to user id
    if (!user.merchant_id) {
      merchantDb.prepare('UPDATE users SET merchant_id = ? WHERE id = ?').run(user.id, user.id);
      user.merchant_id = user.id;
    }
    
    // Return user (without password)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name,
        merchant_id: user.merchant_id || user.id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

module.exports = router;

