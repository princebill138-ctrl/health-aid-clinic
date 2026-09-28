const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { date, month, year, staffId } = req.query;
    let query = {};
    if (date) query.date = date;
    if (staffId) query.staffId = staffId;
    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      query.date = { $regex: `^${prefix}` };
    }
    const records = await Attendance.find(query).populate('staffId', 'fullName department').sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/checkin', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const existing = await Attendance.findOne({ staffId: req.user._id, date: today });
    if (existing) return res.status(400).json({ message: 'Already checked in today' });
    const record = await Attendance.create({
      staffId: req.user._id,
      staffName: req.user.fullName,
      date: today,
      checkIn: time,
      status: 'present'
    });
    res.status(201).json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/checkout', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const record = await Attendance.findOne({ staffId: req.user._id, date: today });
    if (!record) return res.status(400).json({ message: 'No check-in found for today' });
    if (record.checkOut) return res.status(400).json({ message: 'Already checked out today' });
    const [inH, inM] = record.checkIn.split(':').map(Number);
    const [outH, outM] = time.split(':').map(Number);
    const hours = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
    record.checkOut = time;
    record.hoursWorked = Math.round(hours * 10) / 10;
    await record.save();
    res.json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const record = await Attendance.create(req.body);
    res.status(201).json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
