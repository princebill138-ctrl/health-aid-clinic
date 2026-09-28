const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  department: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Automatically hash the password whenever it's set or changed
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Also hash on findByIdAndUpdate / findOneAndUpdate calls that include a password
userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update && update.password) {
    update.password = await bcrypt.hash(update.password, 10);
    this.setUpdate(update);
  }
  next();
});

// password compare
userSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);