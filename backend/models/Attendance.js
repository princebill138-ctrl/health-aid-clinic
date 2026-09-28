const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: String, default: '' },
  checkOut: { type: String, default: '' },
  status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], default: 'present' },
  hoursWorked: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
