const mongoose = require('mongoose');

const drugSchema = new mongoose.Schema({
  drugId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'pcs' },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  expiryDate: { type: Date },
  lowStockThreshold: { type: Number, default: 10 },
  description: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

drugSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold;
});

module.exports = mongoose.model('Drug', drugSchema);
