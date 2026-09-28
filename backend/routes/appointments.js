const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

const genId = async () => {
  const count = await Appointment.countDocuments();
  return `APT-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', protect, async (req, res) => {
  try {
    const { date, status, search } = req.query;
    let query = {};
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      query.date = { $gte: start, $lte: end };
    }
    if (status) query.status = status;
    if (search) query.$or = [{ patientName: { $regex: search, $options: 'i' } }, { doctor: { $regex: search, $options: 'i' } }];
    const appointments = await Appointment.find(query).sort({ date: 1 });
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const appointmentId = await genId();
    const appt = await Appointment.create({ ...req.body, appointmentId, createdBy: req.user._id });
    res.status(201).json(appt);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appt);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appointment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
