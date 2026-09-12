const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Progress = require('../models/progress');
const Evaluation = require('../models/evaluation');
const { authenticate, authorizeAdmin, validateObjectId } = require('../middlewares/auth');
const router = express.Router();

// Expresión regular para validar la contraseña
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!\"#$%&'()*+,-./:;<=>?@[\\\]^_{|}~]).{8,20}$/;

// Validar la contraseña antes de realizar cualquier acción con ella
const validatePassword = (password) => {
  if (!passwordRegex.test(password)) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&).' };
  }
  return { valid: true };
};

// Expresión regular para validar el código de seguridad
const securityCodeRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!\"#$%&'()*+,-./:;<=>?@[\\\]^_{|}~]).{6,20}$/;

// Función para validar el código de seguridad
const validateSecurityCode = (code) => {
  if (!securityCodeRegex.test(code)) {
    return { valid: false, message: 'El código debe tener entre 6 y 20 caracteres, al menos una letra y un número.' };
  }
  return { valid: true };
};

// Registrar un nuevo usuario
router.post('/register', async (req, res) => {
  const { name, email, password, securityCode } = req.body;

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.message });
  }

  const codeValidation = validateSecurityCode(securityCode);
  if (!codeValidation.valid) {
    return res.status(400).json({ error: codeValidation.message });
  }

  try {
    const institutionalEmail = email.replace('@', '.cap@');

    // Verificar si el usuario ya existe con el email modificado
    const userExists = await User.findOne({ email: institutionalEmail });
    if (userExists) return res.status(400).json({ error: 'El usuario ya existe' });

    // Asignar rol según el dominio del email
    let role = '';
    if (email.endsWith('@adminRH.com')) role = 'admin';
    else if (email.endsWith('@adviser.com')) role = 'asesor';
    else if (email.endsWith('@adviserJR.com')) role = 'asesorJR';
    else if (email.endsWith('@managerBR.com')) role = 'gerente_sucursal';
    else if (email.endsWith('@managerZN.com')) role = 'gerente_zona';
    else return res.status(400).json({ error: 'Email no válido para asignar un rol' });

    // Encriptar contraseña y código de seguridad
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityCode = await bcrypt.hash(securityCode, 10);

    const newUser = new User({ name, email: institutionalEmail, password: hashedPassword, securityCode: hashedSecurityCode, role });
    await newUser.save();

    // Generar token
    const token = jwt.sign({ user: { id: newUser._id } }, process.env.JWT_SECRET, { expiresIn: '10h' });
    res.status(201).json({ token });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const institutionalEmail = email.replace('@', '.cap@');

    const user = await User.findOne({ email: institutionalEmail });
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

    // Comparar las contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Contraseña incorrecta' });

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
    const institutionalEmail = email.replace('@', '.cap@');

    const user = await User.findOne({ email: institutionalEmail });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const isCodeValid = await bcrypt.compare(securityCode, user.securityCode);
    if (!isCodeValid) return res.status(400).json({ error: 'Código de seguridad incorrecto' });

    // Generar token temporal
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
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
      resetPasswordToken: token,
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
    let validEmail = false;

    if (role === 'admin' && email.endsWith('@adminRH.com')) {
      validEmail = true;
    } else if (role === 'asesor' && email.endsWith('@adviser.com')) {
      validEmail = true;
    } else if (role === 'asesorJR' && email.endsWith('@adviserJR.com')) {
      validEmail = true;
    } else if (role === 'gerente_sucursal' && email.endsWith('@managerBR.com')) {
      validEmail = true;
    } else if (role === 'gerente_zona' && email.endsWith('@managerZN.com')) {
      validEmail = true;
    }

    if (!validEmail) {
      return res.status(400).json({ error: 'El email no coincide con el rol asignado' });
    }
    if (!email.includes('.cap@')) {
      user.email = email.replace('@', '.cap@');
    } else {
      user.email = email;
    }
    if (name) user.name = name;
    if (role) user.role = role;
    await user.save();

    res.json({ message: 'Usuario actualizado' });
  } catch (error) {
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
    const user = await User.findById(req.user.id).select('-password');
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

    if (name) user.name = name;
    if (email) {
      if (!email.includes('.cap@')) {
        user.email = email.replace('@', '.cap@');
      } else {
        user.email = email;
      }
    }

    await user.save();

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor al actualizar el perfil' });
  }
});

// Eliminar cuenta del usuario autenticado
router.delete('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ message: 'Cuenta eliminada' });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;