const express = require('express');
const router = express.Router();
const Vaccination = require('../models/Vaccination');
const { protect } = require('../middleware/auth');

const genId = async () => {
  const count = await Vaccination.countDocuments();
  return `VAC-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', protect, async (req, res) => {
  try {
    const { search, vaccineType, sex, location } = req.query;
    let query = {};
    if (vaccineType) query.vaccineType = { $regex: vaccineType, $options: 'i' };
    if (sex) query.sex = sex;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (search) query.$or = [
      { patientName: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { vaccineType: { $regex: search, $options: 'i' } }
    ];
    const records = await Vaccination.find(query).sort({ dateAdministered: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const vaccinationId = await genId();
    const record = await Vaccination.create({ ...req.body, vaccinationId, recordedBy: req.user._id });
    res.status(201).json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const record = await Vaccination.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Vaccination.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
