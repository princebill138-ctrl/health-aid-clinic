const mongoose = require('mongoose');

const labSampleSchema = new mongoose.Schema({
  sampleId: { type: String, required: true, unique: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'LabRequest' },
  requestId: { type: String, default: '' },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  sampleType: { type: String, required: true },
  container: { type: String, default: '' },
  collectedAt: { type: Date, default: Date.now },
  collectedBy: { type: String, default: '' },
  status: { type: String, enum: ['collected', 'received', 'processing', 'stored', 'disposed', 'rejected'], default: 'collected' },
  rejectionReason: { type: String, default: '' },
  storageLocation: { type: String, default: '' },
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LabSample', labSampleSchema);
