const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const Attendance = require('../models/Attendance');
const Appointment = require('../models/Appointment');
const Drug = require('../models/Drug');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
    const [totalPatients, newPatientsMonth, totalBills, paidBills, todayAppts, totalMedicines, monthAppts] = await Promise.all([
      Patient.countDocuments({ active: true }),
      Patient.countDocuments({ active: true, createdAt: { $gte: thisMonth } }),
      Billing.countDocuments(),
      Billing.countDocuments({ paymentStatus: 'paid' }),
      Appointment.countDocuments({ date: { $gte: new Date(today), $lte: new Date(today + 'T23:59:59') } }),
      Drug.countDocuments(),
      Appointment.countDocuments({ date: { $gte: thisMonth } })
    ]);
    const revenueAgg = await Billing.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    res.json({
      totalPatients, newPatientsMonth, totalBills, paidBills, todayAppts,
      totalMedicines, monthRecords: monthAppts,
      monthlyRevenue: revenueAgg[0]?.total || 0
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/monthly', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const [patients, billing, attendance, appointments] = await Promise.all([
      Patient.find({ createdAt: { $gte: start, $lte: end } }),
      Billing.find({ createdAt: { $gte: start, $lte: end } }),
      Attendance.find({ date: { $regex: `^${year}-${String(month).padStart(2,'0')}` } }),
      Appointment.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 })
    ]);
    const revenue = billing.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.total, 0);
    const pending = billing.filter(b => b.paymentStatus === 'pending').reduce((s, b) => s + b.total, 0);
    res.json({
      patients: { count: patients.length, list: patients },
      billing: { count: billing.length, revenue, pending, list: billing },
      attendance: { count: attendance.length, present: attendance.filter(a => a.status === 'present').length, list: attendance },
      appointments: { count: appointments.length, completed: appointments.filter(a => a.status === 'completed').length, list: appointments }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
