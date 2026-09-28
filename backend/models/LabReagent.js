const mongoose = require('mongoose');

const labReagentSchema = new mongoose.Schema({
  reagentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: '' },
  supplier: { type: String, default: '' },
  lotNumber: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'pcs' },
  lowStockThreshold: { type: Number, default: 5 },
  storage: { type: String, default: '' },
  expiryDate: { type: Date },
  costPrice: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LabReagent', labReagentSchema);
