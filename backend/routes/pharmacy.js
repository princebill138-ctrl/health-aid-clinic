const express = require('express');
const router = express.Router();
const Drug = require('../models/Drug');
const { protect } = require('../middleware/auth');

const genId = async () => {
  const count = await Drug.countDocuments();
  return `DRG-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', protect, async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    let query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { category: { $regex: search, $options: 'i' } }];
    const drugs = await Drug.find(query).sort({ name: 1 });
    let result = drugs;
    if (lowStock === 'true') result = drugs.filter(d => d.quantity <= d.lowStockThreshold);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const drugId = await genId();
    const drug = await Drug.create({ ...req.body, drugId, addedBy: req.user._id });
    res.status(201).json(drug);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const drug = await Drug.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!drug) return res.status(404).json({ message: 'Drug not found' });
    res.json(drug);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Drug.findByIdAndDelete(req.params.id);
    res.json({ message: 'Drug deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Restock
router.patch('/:id/restock', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const drug = await Drug.findByIdAndUpdate(req.params.id, { $inc: { quantity: Number(quantity) } }, { new: true });
    res.json(drug);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
