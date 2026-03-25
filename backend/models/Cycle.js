const mongoose = require('mongoose');

const CycleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  periodLength: { type: Number }, // calculated: endDate - startDate
  cycleLength: { type: Number },  // calculated: startDate - previous startDate
  flow: { type: String, enum: ['light', 'medium', 'heavy'], default: 'medium' },
  symptoms: [{ type: String, enum: ['cramps', 'headache', 'bloating', 'fatigue', 'backache', 'nausea'] }],
  notes: { type: String, maxlength: 500 },
  isIrregular: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cycle', CycleSchema);