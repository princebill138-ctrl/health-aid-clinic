const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  value: { type: String, default: '' },
  unit: { type: String, default: '' },
  flag: { type: String, enum: ['Normal', 'Low', 'High', 'Critical Low', 'Critical High', 'Abnormal', ''], default: '' },
  referenceText: { type: String, default: '' },
  remarks: { type: String, default: '' },
  enteredBy: { type: String, default: '' },
  enteredAt: { type: Date },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String, default: '' },
  acknowledgedAt: { type: Date }
}, { _id: false });

const requestTestSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest' },
  testName: { type: String, required: true },
  category: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  result: { type: resultSchema, default: () => ({}) }
});

const labRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  age: { type: Number },
  sex: { type: String, default: '' },
  requestedByName: { type: String, default: '' },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  clinicalNotes: { type: String, default: '' },
  tests: [requestTestSchema],
  status: { type: String, enum: ['pending', 'sample-collected', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  completedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LabRequest', labRequestSchema);
