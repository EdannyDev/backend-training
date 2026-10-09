const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  securityCode: { type: String, required: true},
  role: { type: String, enum: ['pendiente', 'asesor', 'asesorJR', 'gerente_sucursal', 'gerente_zona', 'admin'], required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);