const mongoose = require('mongoose');

// Walk-in / laboratory-only patient. Deliberately a SEPARATE collection from
// Patient — registering someone here must never create or touch a record in
// the main Patient Records module.
const labPatientSchema = new mongoose.Schema({
  walkInId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  contact: { type: String, default: '' },
  address: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LabPatient', labPatientSchema);
