const express = require('express');
const router = express.Router();
const LabCategory = require('../models/LabCategory');
const LabTest = require('../models/LabTest');
const LabRequest = require('../models/LabRequest');
const LabSample = require('../models/LabSample');
const LabReagent = require('../models/LabReagent');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');

// ── HELPERS ──
const nextId = async (Model, field, prefix, pad = 4) => {
  let n = (await Model.countDocuments()) + 1;
  while (await Model.exists({ [field]: `${prefix}-${String(n).padStart(pad, '0')}` })) n++;
  return `${prefix}-${String(n).padStart(pad, '0')}`;
};

const userName = (req) => req.user?.fullName || req.user?.username || '';
const rx = (s) => ({ $regex: String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' });

// Pick the reference range that applies to the patient (sex + age)
const pickRange = (test, age, sex) => {
  const ranges = test.referenceRanges || [];
  const fits = (r) => (age == null || (age >= (r.ageMin ?? 0) && age <= (r.ageMax ?? 150)));
  return ranges.find(r => r.sex === sex && fits(r))
      || ranges.find(r => r.sex === 'Any' && fits(r))
      || ranges[0] || null;
};

const rangeText = (test, r) => {
  if (test.resultType === 'qualitative') return test.normalOption || '';
  if (!r) return '';
  const u = test.unit ? ` ${test.unit}` : '';
  if (r.low != null && r.high != null) return `${r.low} – ${r.high}${u}`;
  if (r.low != null) return `≥ ${r.low}${u}`;
  if (r.high != null) return `≤ ${r.high}${u}`;
  return '';
};

// Evaluate a value against a test's reference range → flag
const evaluate = (test, age, sex, rawValue) => {
  if (test.resultType === 'qualitative') {
    return { flag: String(rawValue).toLowerCase() === String(test.normalOption).toLowerCase() ? 'Normal' : 'Abnormal', referenceText: rangeText(test, null) };
  }
  const r = pickRange(test, age, sex);
  const v = parseFloat(rawValue);
  const referenceText = rangeText(test, r);
  if (isNaN(v) || !r) return { flag: '', referenceText };
  let flag = 'Normal';
  if (r.criticalLow != null && v <= r.criticalLow) flag = 'Critical Low';
  else if (r.criticalHigh != null && v >= r.criticalHigh) flag = 'Critical High';
  else if (r.low != null && v < r.low) flag = 'Low';
  else if (r.high != null && v > r.high) flag = 'High';
  return { flag, referenceText };
};

const deriveStatus = (reqDoc) => {
  if (reqDoc.status === 'cancelled') return 'cancelled';
  const tests = reqDoc.tests;
  if (tests.length && tests.every(t => t.status === 'completed')) return 'completed';
  if (tests.some(t => t.status === 'in-progress' || t.status === 'completed')) return 'in-progress';
  return reqDoc.status === 'pending' ? 'pending' : 'sample-collected';
};

// ── STATS ──
router.get('/stats', protect, async (req, res) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [pending, inProgress, completedToday, reagents, requests, pendingInvestigations] = await Promise.all([
      LabRequest.countDocuments({ status: { $in: ['pending', 'sample-collected'] } }),
      LabRequest.countDocuments({ status: 'in-progress' }),
      LabRequest.countDocuments({ status: 'completed', completedAt: { $gte: startOfDay } }),
      LabReagent.find(),
      LabRequest.find({ 'tests.result.flag': { $in: ['Critical Low', 'Critical High'] } }),
      countPendingInvestigations()
    ]);
    let criticalOpen = 0;
    requests.forEach(r => r.tests.forEach(t => {
      if (['Critical Low', 'Critical High'].includes(t.result?.flag) && !t.result.acknowledged) criticalOpen++;
    }));
    res.json({
      pending, inProgress, completedToday, criticalOpen, pendingInvestigations,
      lowReagents: reagents.filter(r => r.quantity <= r.lowStockThreshold).length
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PATIENTS WITH LAB INVESTIGATIONS NOTED IN THEIR CLINICAL RECORD ──
// Surfaces patients whose Patient-record "Lab Investigations" clinical note
// has not yet been turned into a formal Laboratory test request, so lab
// staff can pick them up here instead of them going unnoticed.
async function countPendingInvestigations() {
  const patients = await Patient.find({ active: true, 'clinicalNotes.lab': { $exists: true, $ne: '' } }).select('_id');
  if (!patients.length) return 0;
  const openPatientIds = new Set((await LabRequest.find({ status: { $nin: ['completed', 'cancelled'] } }).select('patient')).map(r => String(r.patient)));
  return patients.filter(p => !openPatientIds.has(String(p._id))).length;
}

router.get('/pending-investigations', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const q = { active: true, 'clinicalNotes.lab': { $exists: true, $ne: '' } };
    if (search) q.$or = [{ name: rx(search) }, { patientId: rx(search) }, { contact: rx(search) }];
    const patients = await Patient.find(q).select('patientId name age sex contact clinicalNotes').sort({ updatedAt: -1 }).limit(200);
    const openReqs = await LabRequest.find({ status: { $nin: ['completed', 'cancelled'] } }).select('patient requestId');
    const openMap = new Map(openReqs.map(r => [String(r.patient), r.requestId]));
    const list = patients.map(p => {
      const notes = (p.clinicalNotes || []).filter(n => n.lab && n.lab.trim()).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      const latest = notes[0];
      return {
        _id: p._id, patientId: p.patientId, name: p.name, age: p.age, sex: p.sex, contact: p.contact,
        latestLabNote: latest?.lab || '', latestNoteDate: latest?.savedAt,
        openRequestId: openMap.get(String(p._id)) || null
      };
    });
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CATEGORIES ──
router.get('/categories', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const q = search ? { $or: [{ name: rx(search) }, { description: rx(search) }] } : {};
    const cats = await LabCategory.find(q).sort({ name: 1 });
    const counts = await LabTest.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
    const map = Object.fromEntries(counts.map(c => [c._id, c.n]));
    res.json(cats.map(c => ({ ...c.toObject(), testCount: map[c.name] || 0 })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/categories', protect, async (req, res) => {
  try { res.status(201).json(await LabCategory.create({ ...req.body, addedBy: req.user._id })); }
  catch (err) { res.status(400).json({ message: err.code === 11000 ? 'Category already exists' : err.message }); }
});

router.put('/categories/:id', protect, async (req, res) => {
  try {
    const old = await LabCategory.findById(req.params.id);
    if (!old) return res.status(404).json({ message: 'Category not found' });
    const cat = await LabCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (req.body.name && req.body.name !== old.name) await LabTest.updateMany({ category: old.name }, { category: req.body.name });
    res.json(cat);
  } catch (err) { res.status(400).json({ message: err.code === 11000 ? 'Category already exists' : err.message }); }
});

router.delete('/categories/:id', protect, async (req, res) => {
  try {
    const cat = await LabCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    if (await LabTest.exists({ category: cat.name })) return res.status(400).json({ message: 'Category has tests assigned to it' });
    await cat.deleteOne();
    res.json({ message: 'Category deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── TESTS (catalogue + reference ranges) ──
router.get('/tests', protect, async (req, res) => {
  try {
    const { search, category, active } = req.query;
    const q = {};
    if (search) q.$or = [{ name: rx(search) }, { testId: rx(search) }, { code: rx(search) }];
    if (category) q.category = category;
    if (active === 'true') q.active = true;
    res.json(await LabTest.find(q).sort({ category: 1, name: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/tests', protect, async (req, res) => {
  try {
    const testId = await nextId(LabTest, 'testId', 'LT', 4);
    res.status(201).json(await LabTest.create({ ...req.body, testId, addedBy: req.user._id }));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/tests/:id', protect, async (req, res) => {
  try {
    const t = await LabTest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!t) return res.status(404).json({ message: 'Test not found' });
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/tests/:id', protect, async (req, res) => {
  try { await LabTest.findByIdAndDelete(req.params.id); res.json({ message: 'Test deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// Load a starter catalogue (only adds tests whose name doesn't already exist)
router.post('/tests/seed-defaults', protect, async (req, res) => {
  try {
    const R = (label, sex, low, high, cl, ch, ageMin = 18, ageMax = 150) => ({ label, sex, low, high, criticalLow: cl, criticalHigh: ch, ageMin, ageMax });
    const defaults = [
      { name: 'Haemoglobin', code: 'HB', category: 'Haematology', sampleType: 'Blood (EDTA)', unit: 'g/dL', price: 15, turnaroundHours: 2,
        referenceRanges: [R('Adult Male', 'Male', 13, 17, 7, 20), R('Adult Female', 'Female', 12, 15.5, 7, 20)] },
      { name: 'White Blood Cell Count', code: 'WBC', category: 'Haematology', sampleType: 'Blood (EDTA)', unit: '×10³/µL', price: 20, turnaroundHours: 2,
        referenceRanges: [R('Adult', 'Any', 4, 11, 2, 30)] },
      { name: 'Platelet Count', code: 'PLT', category: 'Haematology', sampleType: 'Blood (EDTA)', unit: '×10³/µL', price: 20, turnaroundHours: 2,
        referenceRanges: [R('Adult', 'Any', 150, 400, 20, 1000)] },
      { name: 'Fasting Blood Glucose', code: 'FBG', category: 'Biochemistry', sampleType: 'Blood (Fluoride)', unit: 'mmol/L', price: 10, turnaroundHours: 1,
        referenceRanges: [R('Adult', 'Any', 3.9, 5.6, 2.5, 25)] },
      { name: 'Serum Creatinine', code: 'CREAT', category: 'Biochemistry', sampleType: 'Serum', unit: 'µmol/L', price: 25, turnaroundHours: 4,
        referenceRanges: [R('Adult Male', 'Male', 60, 110, null, 500), R('Adult Female', 'Female', 45, 90, null, 500)] },
      { name: 'Serum Potassium', code: 'K', category: 'Biochemistry', sampleType: 'Serum', unit: 'mmol/L', price: 20, turnaroundHours: 4,
        referenceRanges: [R('Adult', 'Any', 3.5, 5.1, 2.5, 6.5)] },
      { name: 'Malaria Parasite (RDT)', code: 'MP', category: 'Parasitology', sampleType: 'Blood', resultType: 'qualitative', qualitativeOptions: ['Positive', 'Negative'], normalOption: 'Negative', price: 15, turnaroundHours: 1 },
      { name: 'Hepatitis B Surface Antigen', code: 'HBsAg', category: 'Serology', sampleType: 'Serum', resultType: 'qualitative', qualitativeOptions: ['Reactive', 'Non-reactive'], normalOption: 'Non-reactive', price: 25, turnaroundHours: 2 },
      { name: 'Urine Pregnancy Test', code: 'UPT', category: 'Serology', sampleType: 'Urine', resultType: 'qualitative', qualitativeOptions: ['Positive', 'Negative'], normalOption: 'Negative', price: 10, turnaroundHours: 1 }
    ];
    let added = 0;
    for (const d of defaults) {
      if (await LabTest.exists({ name: d.name })) continue;
      if (!(await LabCategory.exists({ name: d.category }))) await LabCategory.create({ name: d.category, addedBy: req.user._id });
      await LabTest.create({ ...d, testId: await nextId(LabTest, 'testId', 'LT', 4), addedBy: req.user._id });
      added++;
    }
    res.json({ message: `${added} test(s) added`, added });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── REQUESTS ──
router.get('/requests', protect, async (req, res) => {
  try {
    const { search, status, priority, from, to, patientId } = req.query;
    const q = {};
    if (status) q.status = status;
    if (priority) q.priority = priority;
    if (patientId) q.patientId = patientId;
    if (search) q.$or = [{ requestId: rx(search) }, { patientName: rx(search) }, { patientId: rx(search) }, { 'tests.testName': rx(search) }];
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); q.createdAt.$lte = d; }
    }
    res.json(await LabRequest.find(q).sort({ createdAt: -1 }).limit(500));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Abnormal / critical result alerts
router.get('/alerts', protect, async (req, res) => {
  try {
    const { level, acknowledged } = req.query; // level: critical | abnormal
    const reqs = await LabRequest.find({ 'tests.result.flag': { $nin: ['', 'Normal'] }, status: { $ne: 'cancelled' } }).sort({ updatedAt: -1 }).limit(300);
    const alerts = [];
    reqs.forEach(r => r.tests.forEach(t => {
      const flag = t.result?.flag;
      if (!flag || flag === 'Normal') return;
      const critical = flag.startsWith('Critical');
      if (level === 'critical' && !critical) return;
      if (level === 'abnormal' && critical) return;
      if (acknowledged === 'true' && !t.result.acknowledged) return;
      if (acknowledged === 'false' && t.result.acknowledged) return;
      alerts.push({
        requestMongoId: r._id, requestId: r.requestId, itemId: t._id,
        patientId: r.patientId, patientName: r.patientName,
        testName: t.testName, category: t.category, critical,
        ...(t.result.toObject ? t.result.toObject() : t.result)
      });
    }));
    alerts.sort((a, b) => (b.critical - a.critical) || (new Date(b.enteredAt || 0) - new Date(a.enteredAt || 0)));
    res.json(alerts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/requests/:id', protect, async (req, res) => {
  try {
    const r = await LabRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    const samples = await LabSample.find({ request: r._id });
    res.json({ ...r.toObject(), samples });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/requests', protect, async (req, res) => {
  try {
    const { patient: patientMongoId, testIds = [], priority, clinicalNotes, requestedByName } = req.body;
    const patient = await Patient.findById(patientMongoId);
    if (!patient) return res.status(400).json({ message: 'Select a valid patient' });
    if (!testIds.length) return res.status(400).json({ message: 'Select at least one test' });
    const tests = await LabTest.find({ _id: { $in: testIds } });
    if (!tests.length) return res.status(400).json({ message: 'Selected tests not found' });
    const doc = await LabRequest.create({
      requestId: await nextId(LabRequest, 'requestId', 'LAB', 5),
      patient: patient._id, patientId: patient.patientId, patientName: patient.name,
      age: patient.age, sex: patient.sex,
      requestedByName: requestedByName || userName(req),
      priority, clinicalNotes,
      tests: tests.map(t => ({ test: t._id, testName: t.name, category: t.category, result: { unit: t.unit } })),
      createdBy: req.user._id
    });
    res.status(201).json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/requests/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'sample-collected', 'in-progress', 'cancelled'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });
    const r = await LabRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    r.status = status;
    if (status === 'in-progress') r.tests.forEach(t => { if (t.status === 'pending') t.status = 'in-progress'; });
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Enter / update results. body: { results: [{ itemId, value, remarks }] }
router.put('/requests/:id/results', protect, async (req, res) => {
  try {
    const r = await LabRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    if (r.status === 'cancelled') return res.status(400).json({ message: 'Request was cancelled' });
    const testDocs = await LabTest.find({ _id: { $in: r.tests.map(t => t.test).filter(Boolean) } });
    const byId = Object.fromEntries(testDocs.map(t => [String(t._id), t]));

    for (const entry of (req.body.results || [])) {
      const item = r.tests.id(entry.itemId);
      if (!item) continue;
      const value = String(entry.value ?? '').trim();
      if (!value) continue;
      const def = byId[String(item.test)];
      const ev = def ? evaluate(def, r.age, r.sex, value) : { flag: '', referenceText: '' };
      const changed = item.result?.value !== value;
      item.result = {
        value, unit: def?.unit || item.result?.unit || '',
        flag: ev.flag, referenceText: ev.referenceText,
        remarks: entry.remarks || '',
        enteredBy: userName(req), enteredAt: new Date(),
        // A changed value must be re-acknowledged
        acknowledged: changed ? false : !!item.result?.acknowledged,
        acknowledgedBy: changed ? '' : item.result?.acknowledgedBy,
        acknowledgedAt: changed ? undefined : item.result?.acknowledgedAt
      };
      item.status = 'completed';
    }
    r.status = deriveStatus(r);
    if (r.status === 'completed' && !r.completedAt) r.completedAt = new Date();
    if (r.status !== 'completed') r.completedAt = undefined;
    await r.save();

    const criticals = r.tests.filter(t => t.result?.flag?.startsWith('Critical')).map(t => t.testName);
    res.json({ request: r, criticals });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Per-test status (e.g. mark a single test as in-progress)
router.patch('/requests/:id/tests/:itemId/status', protect, async (req, res) => {
  try {
    const r = await LabRequest.findById(req.params.id);
    const item = r?.tests.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Test item not found' });
    if (!['pending', 'in-progress'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    item.status = req.body.status;
    r.status = deriveStatus(r);
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Acknowledge an abnormal/critical result
router.patch('/requests/:id/tests/:itemId/acknowledge', protect, async (req, res) => {
  try {
    const r = await LabRequest.findById(req.params.id);
    const item = r?.tests.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Test item not found' });
    item.result.acknowledged = true;
    item.result.acknowledgedBy = userName(req);
    item.result.acknowledgedAt = new Date();
    await r.save();
    res.json({ message: 'Acknowledged' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/requests/:id', protect, async (req, res) => {
  try {
    const r = await LabRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    if (r.tests.some(t => t.status === 'completed')) return res.status(400).json({ message: 'Requests with results cannot be deleted — cancel instead' });
    await LabSample.deleteMany({ request: r._id });
    await r.deleteOne();
    res.json({ message: 'Request deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── SAMPLES ──
router.get('/samples', protect, async (req, res) => {
  try {
    const { search, status, sampleType } = req.query;
    const q = {};
    if (status) q.status = status;
    if (sampleType) q.sampleType = sampleType;
    if (search) q.$or = [{ sampleId: rx(search) }, { patientName: rx(search) }, { patientId: rx(search) }, { requestId: rx(search) }];
    res.json(await LabSample.find(q).sort({ collectedAt: -1 }).limit(500));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/samples', protect, async (req, res) => {
  try {
    const { request: requestMongoId, ...rest } = req.body;
    const r = await LabRequest.findById(requestMongoId);
    if (!r) return res.status(400).json({ message: 'Select a valid test request' });
    const sample = await LabSample.create({
      ...rest,
      sampleId: await nextId(LabSample, 'sampleId', 'SMP', 5),
      request: r._id, requestId: r.requestId, patientId: r.patientId, patientName: r.patientName,
      collectedBy: rest.collectedBy || userName(req), recordedBy: req.user._id
    });
    if (r.status === 'pending') { r.status = 'sample-collected'; await r.save(); }
    res.status(201).json(sample);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/samples/:id', protect, async (req, res) => {
  try {
    const { request, requestId, patientId, patientName, sampleId, ...safe } = req.body;
    const s = await LabSample.findByIdAndUpdate(req.params.id, safe, { new: true, runValidators: true });
    if (!s) return res.status(404).json({ message: 'Sample not found' });
    res.json(s);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/samples/:id/status', protect, async (req, res) => {
  try {
    const s = await LabSample.findByIdAndUpdate(req.params.id,
      { status: req.body.status, ...(req.body.rejectionReason ? { rejectionReason: req.body.rejectionReason } : {}) },
      { new: true, runValidators: true });
    if (!s) return res.status(404).json({ message: 'Sample not found' });
    res.json(s);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/samples/:id', protect, async (req, res) => {
  try { await LabSample.findByIdAndDelete(req.params.id); res.json({ message: 'Sample deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── REAGENTS / INVENTORY ──
router.get('/reagents', protect, async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    const q = search ? { $or: [{ name: rx(search) }, { category: rx(search) }, { lotNumber: rx(search) }, { reagentId: rx(search) }] } : {};
    let list = await LabReagent.find(q).sort({ name: 1 });
    if (lowStock === 'true') list = list.filter(d => d.quantity <= d.lowStockThreshold);
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/reagents', protect, async (req, res) => {
  try {
    const reagentId = await nextId(LabReagent, 'reagentId', 'RGT', 4);
    res.status(201).json(await LabReagent.create({ ...req.body, reagentId, addedBy: req.user._id }));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/reagents/:id', protect, async (req, res) => {
  try {
    const d = await LabReagent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) return res.status(404).json({ message: 'Reagent not found' });
    res.json(d);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/reagents/:id', protect, async (req, res) => {
  try { await LabReagent.findByIdAndDelete(req.params.id); res.json({ message: 'Reagent deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/reagents/:id/restock', protect, async (req, res) => {
  try {
    const qty = Number(req.body.quantity);
    if (!(qty > 0)) return res.status(400).json({ message: 'Enter a valid quantity' });
    res.json(await LabReagent.findByIdAndUpdate(req.params.id, { $inc: { quantity: qty } }, { new: true }));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Record usage (deduct stock, never below zero)
router.patch('/reagents/:id/use', protect, async (req, res) => {
  try {
    const qty = Number(req.body.quantity);
    if (!(qty > 0)) return res.status(400).json({ message: 'Enter a valid quantity' });
    const d = await LabReagent.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Reagent not found' });
    if (qty > d.quantity) return res.status(400).json({ message: `Only ${d.quantity} ${d.unit} in stock` });
    d.quantity -= qty;
    await d.save();
    res.json(d);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
