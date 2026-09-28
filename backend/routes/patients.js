const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');

const genId = async () => {
  const count = await Patient.countDocuments();
  return `PAT-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query = { active: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const patientId = await genId();
    const patient = await Patient.create({ ...req.body, patientId, registeredBy: req.user._id });
    res.status(201).json(patient);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Patient.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ message: 'Patient deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/patients/:id/clinical - Save clinical notes (optional, falls back to localStorage on frontend)
router.post('/:id/clinical', protect, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $push: { clinicalNotes: { ...req.body, savedAt: new Date(), savedBy: req.user._id } } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.status(201).json({ message: 'Clinical notes saved' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/patients/:id/clinical - Get clinical notes history
router.get('/:id/clinical', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('clinicalNotes');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient.clinicalNotes || []);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/patients/:id/vitals - Save a vitals reading for a patient
router.post('/:id/vitals', protect, async (req, res) => {
  try {
    const fields = ['temperature', 'bloodPressure', 'pulseRate', 'respiratoryRate',
                    'oxygenSaturation', 'weight', 'height', 'bloodGlucose', 'vitalsNotes'];
    const reading = {};
    fields.forEach(f => {
      const v = req.body[f];
      if (v !== undefined && v !== null && v !== '') reading[f] = v;
    });
    const when = new Date(req.body.recordedAt);
    reading.recordedAt = isNaN(when.getTime()) ? new Date() : when;
    reading.recordedBy = req.user._id;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $push: { vitals: reading } },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.status(201).json({ message: 'Vitals saved' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/patients/:id/vitals - Get vitals history (newest first)
router.get('/:id/vitals', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('vitals');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const vitals = (patient.vitals || []).slice()
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    res.json(vitals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
