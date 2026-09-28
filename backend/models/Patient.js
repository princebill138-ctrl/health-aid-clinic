const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  contact: { type: String, required: true },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  bloodGroup: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
  allergies: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  emergencyPhone: { type: String, default: '' },
  clinicalNotes: [{
    id: { type: Number },
    complaints: { type: String, default: '' },
    lab: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    treatment: { type: String, default: '' },
    detention: { type: String, default: '' },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  vitals: [{
    temperature: { type: Number },
    bloodPressure: { type: String, default: '' },
    pulseRate: { type: Number },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bloodGlucose: { type: Number },
    vitalsNotes: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
