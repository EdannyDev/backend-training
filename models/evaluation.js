const mongoose = require('mongoose');

const EvaluationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  score: { type: Number, required: true },
  status: { type: String, enum: ['pendiente', 'aprobado', 'fallado'], default: 'pendiente' },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Evaluation', EvaluationSchema);