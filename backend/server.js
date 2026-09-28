const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/laboratory', require('./routes/laboratory'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/vaccination', require('./routes/vaccination'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/staff', require('./routes/staff'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Health-Aid Clinic API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Health-Aid Clinic server running on port ${PORT}`);
});

module.exports = app;
