const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const { protect } = require('../middleware/auth');

const genId = async () => {
  const count = await Billing.countDocuments();
  return `BILL-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', protect, async (req, res) => {
  try {
    const { status, search, month, year } = req.query;
    let query = {};
    if (status) query.paymentStatus = status;
    if (search) query.$or = [{ patientName: { $regex: search, $options: 'i' } }, { billId: { $regex: search, $options: 'i' } }];
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.createdAt = { $gte: start, $lte: end };
    }
    const bills = await Billing.find(query).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id).populate('patientId', 'name contact address');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const billId = await genId();
    const { items, discount = 0, tax = 0 } = req.body;
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal + (subtotal * tax / 100) - discount;
    const bill = await Billing.create({ ...req.body, billId, subtotal, total, createdBy: req.user._id });
    res.status(201).json(bill);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const bill = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
