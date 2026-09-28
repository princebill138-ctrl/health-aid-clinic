const mongoose = require('mongoose');

const referenceRangeSchema = new mongoose.Schema({
  label: { type: String, default: '' },                 // e.g. "Adult Male"
  sex: { type: String, enum: ['Any', 'Male', 'Female'], default: 'Any' },
  ageMin: { type: Number, default: 0 },
  ageMax: { type: Number, default: 150 },
  low: { type: Number },
  high: { type: Number },
  criticalLow: { type: Number },
  criticalHigh: { type: Number }
}, { _id: false });

const labTestSchema = new mongoose.Schema({
  testId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String, default: '' },
  category: { type: String, default: '' },
  sampleType: { type: String, default: 'Blood' },
  resultType: { type: String, enum: ['numeric', 'qualitative'], default: 'numeric' },
  unit: { type: String, default: '' },
  price: { type: Number, default: 0 },
  turnaroundHours: { type: Number, default: 24 },
  referenceRanges: [referenceRangeSchema],
  qualitativeOptions: { type: [String], default: ['Positive', 'Negative'] },
  normalOption: { type: String, default: 'Negative' },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LabTest', labTestSchema);
