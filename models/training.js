const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  document: {
    fileUrl: { type: String },
    originalFileName: { type: String },
  },
  video: { 
    fileUrl: { type: String },
    originalFileName: { type: String },
  },
  roles: {
    type: [String],
    enum: ['asesor', 'asesorJR', 'gerente_sucursal', 'gerente_zona', 'admin'],
    required: true,
  },
  section: { type: String },
  module: { type: String },
  submodule: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Training', trainingSchema);