const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['opcion_multiple', 'verdadero_falso'], required: true },
  options: [{ text: String, correct: Boolean }],
  correctAnswer: { type: Boolean },
  roles: { type: [String], enum: ['asesor', 'asesorJR', 'gerente_sucursal', 'gerente_zona', 'admin'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);