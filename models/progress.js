const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true },
  status: { type: String, enum: ['cursando', 'completado'], required: true },
  documentProgress: { type: Number, default: 0 },
  videoProgress: { type: Number, default: 0 },
  totalProgress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Progress', ProgressSchema);