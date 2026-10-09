const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Progress = require('../models/progress');
const Evaluation = require('../models/evaluation');
const { authenticate, authorizeAdmin, validateObjectId } = require('../middlewares/auth');
const router = express.Router();

const VALID_ROLES = ['pendiente', 'asesor', 'asesorJR', 'gerente_sucursal', 'gerente_zona', 'admin'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => String(email).trim().toLowerCase();
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Solo letras y espacios: evita inyectar HTML en el correo que recibe RH y en la UI
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/;
const isValidName = (name) =>
  typeof name === 'string' && name.trim().length >= 3 && name.trim().length <= 30 && nameRegex.test(name.trim());

// Expresión regular para validar la contraseña
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!\"#$%&'()*+,-./:;<=>?@[\\\]^_{|}~]).{8,20}$/;

// Validar la contraseña antes de realizar cualquier acción con ella
const validatePassword = (password) => {
  if (!passwordRegex.test(password)) {
    return { valid: false, message: 'La contraseña debe tener entre 8 y 20 caracteres, una mayúscula, una minúscula, un número y un carácter especial.' };
  }
  return { valid: true };
};

// Expresión regular para validar el código de seguridad
const securityCodeRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!\"#$%&'()*+,-./:;<=>?@[\\\]^_{|}~]).{6,20}$/;

// Función para validar el código de seguridad
const validateSecurityCode = (code) => {
  if (!securityCodeRegex.test(code)) {
    return { valid: false, message: 'El código debe tener entre 6 y 20 caracteres, una mayúscula, una minúscula, un número y un carácter especial.' };
  }
  return { valid: true };
};

// Registrar un nuevo usuario
router.post('/register', async (req, res) => {
  const { name, email, password, securityCode } = req.body;

  if (!isValidName(name)) {
    return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres y solo letras y espacios.' });
  }

  if (typeof email !== 'string' || email.length > 50 || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Correo electrónico no válido.' });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.message });
  }

  const codeValidation = validateSecurityCode(securityCode);
  if (!codeValidation.valid) {
    return res.status(400).json({ error: codeValidation.message });
  }

  try {
    const normalizedEmail = normalizeEmail(email);

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) return res.status(400).json({ error: 'El usuario ya existe' });

    // Encriptar contraseña y código de seguridad
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityCode = await bcrypt.hash(securityCode, 10);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      securityCode: hashedSecurityCode,
      role: 'pendiente',
    });
    await newUser.save();

    // Generar token
    const token = jwt.sign({ user: { id: newUser._id } }, process.env.JWT_SECRET, { expiresIn: '10h' });
    res.status(201).json({ token });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'El usuario ya existe' });
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: normalizeEmail(email) });
    const isMatch = user && (await bcrypt.compare(String(password), user.password));
    if (!isMatch) return res.status(400).json({ error: 'Credenciales inválidas' });

    // Generar token
    const token = jwt.sign({ user: { id: user._id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '10h' });
    res.json({ token, role: user.role, userId: user._id });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Solicitar restablecimiento de contraseña
router.post('/forgot-password', async (req, res) => {
  const { email, securityCode } = req.body;

  try {
    const user = await User.findOne({ email: normalizeEmail(email) });
    const isCodeValid = user && (await bcrypt.compare(String(securityCode), user.securityCode));
    if (!isCodeValid) return res.status(400).json({ error: 'Correo o código de seguridad incorrecto' });

    // Token temporal: al cliente se le entrega en claro, en la BD se guarda su hash
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    res.json({ message: 'Solicitud de restablecimiento enviada', resetToken });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Restablecer contraseña
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.message });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Contraseña restablecida con éxito' });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener todos los usuarios (solo admin)
router.get('/list', authenticate, authorizeAdmin, async (req, res) => {
  try {
    // No permitir que el admin vea su propio perfil
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('-password -securityCode -resetPasswordToken -resetPasswordExpires');

    res.json(users);
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener un usuario por ID (solo admin)
router.get('/list/:id', authenticate, authorizeAdmin, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -securityCode -resetPasswordToken -resetPasswordExpires');

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Actualizar un usuario (solo admin)
router.put('/update/:id', authenticate, authorizeAdmin, validateObjectId, async (req, res) => {
  const { name, email, role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Verificar que el admin no intente actualizar su propio perfil
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ error: 'No puedes actualizar tus propios datos desde esta ruta' });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    if (name !== undefined && !isValidName(name)) {
      return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres y solo letras y espacios.' });
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Correo electrónico no válido.' });
      }
      user.email = normalizedEmail;
    }

    if (name) user.name = name.trim();
    if (role) user.role = role;
    await user.save();

    res.json({ message: 'Usuario actualizado' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Eliminar un usuario (solo admin)
router.delete('/delete/:id', authenticate, authorizeAdmin, validateObjectId, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id.toString()) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await Progress.deleteMany({ userId: id });
    await Evaluation.deleteMany({ userId: id });

    res.json({ message: 'Usuario, progreso y evaluaciones eliminados correctamente' });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener perfil del usuario autenticado
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -securityCode -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Actualizar perfil del usuario autenticado
router.put('/profile', authenticate, async (req, res) => {
  const { name, email, newPassword, newSecurityCode } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (newPassword && await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual' });
    }

    if (newSecurityCode && await bcrypt.compare(newSecurityCode, user.securityCode)) {
      return res.status(400).json({ error: 'El nuevo código de seguridad no puede ser igual al actual' });
    }

    if (newPassword) {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (newSecurityCode) {
      const codeValidation = validateSecurityCode(newSecurityCode);
      if (!codeValidation.valid) {
        return res.status(400).json({ error: codeValidation.message });
      }
      user.securityCode = await bcrypt.hash(newSecurityCode, 10);
    }

    if (name) {
      if (!isValidName(name)) {
        return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres y solo letras y espacios.' });
      }
      user.name = name.trim();
    }

    // Solo el admin cambia su correo desde el perfil
    if (email && req.user.role === 'admin') {
      const normalizedEmail = normalizeEmail(email);
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Correo electrónico no válido.' });
      }
      user.email = normalizedEmail;
    }

    await user.save();

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error del servidor al actualizar el perfil' });
  }
});

// Eliminar cuenta del usuario autenticado
router.delete('/profile', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const admins = await User.countDocuments({ role: 'admin' });
      if (admins <= 1) {
        return res.status(400).json({ error: 'No puedes eliminar la única cuenta de administrador.' });
      }
    }

    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await Progress.deleteMany({ userId: req.user.id });
    await Evaluation.deleteMany({ userId: req.user.id });

    res.json({ message: 'Cuenta eliminada' });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;