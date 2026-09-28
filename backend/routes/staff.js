const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// GET all staff
router.get('/', protect, async (req, res) => {
  try {
    const staff = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create staff
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const staff = await User.create(req.body);
    const { password, ...data } = staff.toObject();
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT update staff
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (!updates.password) delete updates.password;
    const staff = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE staff
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
