const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  vaccinationId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  location: { type: String, required: true },
  vaccineType: { type: String, required: true },
  doseNumber: { type: String, default: '1st' },
  batchNumber: { type: String, default: '' },
  dateAdministered: { type: Date, required: true },
  nextDueDate: { type: Date },
  administrator: { type: String, default: '' },
  testResults: { type: String, default: '' },
  sideEffects: { type: String, default: '' },
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Vaccination', vaccinationSchema);
