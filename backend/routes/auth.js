const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'healthaid_secret', {
    expiresIn: '7d'
  });


// ─────────────────────────────
// LOGIN
// ─────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Trim whitespace (phone keyboards/autofill often add a trailing space)
    const user = await User.findOne({ username: String(username || '').trim(), active: true });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─────────────────────────────
// GET CURRENT USER
// ─────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});


// ─────────────────────────────
// SETUP ADMIN (FIXED)
// ─────────────────────────────
router.get('/setup', async (req, res) => {
  try {
    const count = await User.countDocuments();

    if (count > 0) {
      return res.status(400).json({
        message: 'Setup already completed'
      });
    }

    // NOTE: the User model already hashes the password on save,
    // so pass the plain password here (hashing twice breaks login).
    const admin = await User.create({
      username: 'admin',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'admin',
      department: 'Administration',
      active: true
    });

    res.json({
      message: 'Admin created successfully',
      username: 'admin',
      password: 'admin123'
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;