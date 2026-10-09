// test/evaluation.test.js
// Uso: 1) npm start en una terminal  2) node test/evaluation.test.js en otra
// Requiere Node 18+ (fetch global). Crea datos de prueba y los borra al final.
// Dependen del horario laboral de Mérida (L-V 8:30-18:30): el propio sistema lo exige.

require('dotenv').config();
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const User = require('../models/user');
const Training = require('../models/training');
const Question = require('../models/question');
const Evaluation = require('../models/evaluation');
const Progress = require('../models/progress');

const BASE = process.env.TEST_API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const TAG = `t${Date.now()}`;
const EMAIL = `${TAG}@example.com`; // el correo se guarda tal cual, en minúsculas
const PASSWORD = 'Test#1234ab';
const CODE = 'Code#1234';

const results = [];
const skipped = [];

const check = (name, ok, detail = '') => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
};

const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};

const inWorkHours = () => {
  const now = moment.tz('America/Merida');
  const day = now.day();
  const start = now.clone().set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
  const end = now.clone().set({ hour: 18, minute: 30, second: 0, millisecond: 0 });
  return day >= 1 && day <= 5 && now.isBetween(start, end, null, '[]');
};

// Escribe updatedAt directo en el driver para simular el paso del tiempo
const setUpdatedAt = (userId, date) =>
  Evaluation.collection.updateOne({ userId }, { $set: { updatedAt: date } });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await Evaluation.init(); // asegura el índice único de userId
    await Progress.init(); // asegura el índice único (userId, trainingId)
  } catch (e) {
    console.error(
      'No se pudo crear el índice único de userId: hay evaluaciones duplicadas en tu BD local.\n' +
        'Borra la colección evaluations de tu base local y vuelve a correr el script.'
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const created = { userId: null, questionIds: [] };

  try {
    const adminTry = await api('/users/register', {
      method: 'POST',
      body: { name: 'Admin Test', email: `${TAG}x@adminRH.com`, password: PASSWORD, securityCode: CODE },
    });
    const adminUser = await User.findOne({ email: `${TAG}x@adminrh.com` });
    check(
      'T1 registrarse con un correo @adminRH.com NO otorga rol admin (queda pendiente)',
      adminTry.status === 201 && adminUser && adminUser.role === 'pendiente',
      `status=${adminTry.status}, rol=${adminUser ? adminUser.role : 'sin usuario'}`
    );

    const reg = await api('/users/register', {
      method: 'POST',
      body: { name: 'Test User', email: EMAIL, password: PASSWORD, securityCode: CODE },
    });
    const user = await User.findOne({ email: EMAIL });
    created.userId = user ? user._id : null;
    const token = reg.data && reg.data.token;
    check('T2a registro normal crea la cuenta como pendiente', reg.status === 201 && user && user.role === 'pendiente', `status=${reg.status}`);
    if (!user || !token) throw new Error('No se pudo registrar el usuario de prueba (¿429 por el rate limit? reinicia el servidor).');

    const pendingDone = await api(`/progress/completed/${user._id}`, { token });
    check(
      'T2b una cuenta pendiente no cuenta como "capacitación completa"',
      pendingDone.status === 200 && pendingDone.data && pendingDone.data.allCompleted === false,
      `status=${pendingDone.status}`
    );

    await User.updateOne({ _id: user._id }, { role: 'asesor' });

    const f1 = await api('/users/forgot-password', { method: 'POST', body: { email: EMAIL, securityCode: 'Wrong#123' } });
    const f2 = await api('/users/forgot-password', { method: 'POST', body: { email: `nadie${TAG}@example.com`, securityCode: 'Wrong#123' } });
    check(
      'T3a usuario inexistente y código incorrecto dan la misma respuesta',
      f1.status === 400 && f2.status === 400 && f1.data && f2.data && f1.data.error === f2.data.error
    );
    const f3 = await api('/users/forgot-password', { method: 'POST', body: { email: EMAIL, securityCode: CODE } });
    const stored = await User.findById(user._id);
    check(
      'T3b el token de recuperación se guarda hasheado',
      f3.status === 200 && f3.data && stored.resetPasswordToken && stored.resetPasswordToken !== f3.data.resetToken
    );
    const rp = await api('/users/reset-password', {
      method: 'POST',
      body: { token: f3.data && f3.data.resetToken, newPassword: 'Newpass#1234' },
    });
    check('T3c restablecer contraseña con ese token funciona', rp.status === 200, `status=${rp.status}`);

    const qs = await Question.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        text: `${TAG} pregunta ${i + 1}`,
        type: 'verdadero_falso',
        correctAnswer: true,
        roles: ['asesor'],
      }))
    );
    created.questionIds = qs.map((q) => q._id);

    const others = await Training.find({ roles: 'asesor' });
    if (others.length) {
      await Progress.insertMany(
        others.map((t) => ({
          userId: user._id,
          trainingId: t._id,
          status: 'completado',
          documentProgress: 100,
          videoProgress: 100,
          totalProgress: 100,
          completed: true,
        }))
      );
    }
    const training = await Training.create({
      title: `${TAG} material`,
      description: 'Material de prueba',
      roles: ['asesor'],
      section: 'Pruebas',
      module: 'Pruebas',
      document: { fileUrl: 'https://res.cloudinary.com/test/raw/upload/prueba.pdf', originalFileName: 'prueba' },
    });

    const progressBody = { trainingId: String(training._id), type: 'document', progress: 100 };
    await api('/progress/start', { method: 'POST', token, body: { trainingId: progressBody.trainingId, type: 'document' } });
    await Progress.updateOne({ userId: user._id, trainingId: training._id }, { $set: { documentStartedAt: new Date(Date.now() - 10 * 60 * 1000) } });
    const burst = await Promise.all(
      Array.from({ length: 15 }, () => api('/progress/progress', { method: 'POST', token, body: progressBody }))
    );
    const evCount = await Evaluation.countDocuments({ userId: user._id });
    const okCount = burst.filter((r) => r.status === 200).length;
    check('T4 15 peticiones simultáneas de progreso crean una sola evaluación', evCount === 1 && okCount === 15, `evaluaciones=${evCount}, respuestas 200=${okCount}/15`);
    
    const training2 = await Training.create({
      title: `${TAG} material 2`, description: 'Material de prueba', roles: ['asesor'], section: 'Pruebas', module: 'Pruebas',
      document: { fileUrl: 'https://res.cloudinary.com/test/raw/upload/prueba2.pdf', originalFileName: 'prueba2' },
    });
    await api('/progress/start', { method: 'POST', token, body: { trainingId: String(training2._id), type: 'document' } });
    const fast = await api('/progress/progress', { method: 'POST', token, body: { trainingId: String(training2._id), type: 'document', progress: 100 } });
    check('T4b enviar 100 % de un documento recién abierto se recorta por tiempo', fast.status === 200 && fast.data && fast.data.documentProgress < 100, `documentProgress=${fast.data && fast.data.documentProgress}`);

    if (inWorkHours()) {
      const subs = await Promise.all(
        Array.from({ length: 6 }, () => api('/evaluations/submit', { method: 'POST', token, body: { answers: [] } }))
      );
      const accepted = subs.filter((s) => s.status === 200).length;
      const evAfter = await Evaluation.findOne({ userId: user._id });
      check('T5 6 envíos simultáneos de la misma evaluación: solo uno se acepta', accepted === 1 && evAfter.status === 'fallado', `aceptados=${accepted}`);

      let loopOk = true;
      for (let i = 1; i <= 2; i += 1) {
        await setUpdatedAt(user._id, moment().subtract(10, 'minutes').toDate());
        const r = await api('/evaluations/retry', { method: 'POST', token });
        const s = await api('/evaluations/submit', { method: 'POST', token, body: { answers: [] } });
        if (r.status !== 200 || s.status !== 200) loopOk = false;
      }
      await setUpdatedAt(user._id, moment().subtract(10, 'minutes').toDate());
      const blocked = await api('/evaluations/retry', { method: 'POST', token });
      check('T6a tras 2 reintentos (3 presentaciones) el mismo día se bloquea el siguiente', loopOk && blocked.status === 400, `status=${blocked.status}`);

      await setUpdatedAt(user._id, moment().subtract(1, 'day').toDate());
      const nextDay = await api('/evaluations/retry', { method: 'POST', token });
      check('T6b al día siguiente el contador se reinicia (antes: bloqueo permanente)', nextDay.status === 200, `status=${nextDay.status}`);
      await api('/evaluations/submit', { method: 'POST', token, body: { answers: [] } });
      await setUpdatedAt(user._id, moment().subtract(10, 'minutes').toDate());
      const rts = await Promise.all(Array.from({ length: 6 }, () => api('/evaluations/retry', { method: 'POST', token })));
      const okRetry = rts.filter((r) => r.status === 200).length;
      const evR = await Evaluation.findOne({ userId: user._id });
      check('T9 6 reintentos simultáneos: solo uno se acepta y cuenta un intento', okRetry === 1 && evR.attempts === 2, `aceptados=${okRetry}, intentos=${evR.attempts}`);
    } else {
      skipped.push('T5 y T6 (fuera del horario laboral de Mérida, L-V 8:30-18:30)');
    }

    await Evaluation.collection.updateOne({ userId: user._id }, { $set: { status: 'aprobado', score: 100 } });
    await api('/progress/progress', { method: 'POST', token, body: progressBody });
    const finalEv = await Evaluation.find({ userId: user._id });
    check('T7 reabrir un material no borra una evaluación aprobada', finalEv.length === 1 && finalEv[0].status === 'aprobado');

    await User.updateOne({ _id: user._id }, { role: 'admin' });
    const bad = await api('/trainings', {
      method: 'POST',
      token,
      body: {
        title: `${TAG} malo`,
        description: 'x',
        roles: ['asesor'],
        section: 'Pruebas',
        module: 'Pruebas',
        documentUrl: 'javascript:alert(1)',
      },
    });
    check('T8 una URL que no es de Cloudinary es rechazada', bad.status === 400, `status=${bad.status}`);
  } finally {
    const re = new RegExp(`^${TAG}`);
    if (created.userId) {
      await Progress.deleteMany({ userId: created.userId });
      await Evaluation.deleteMany({ userId: created.userId });
    }
    await User.deleteMany({ email: re });
    await Training.deleteMany({ title: re });
    if (created.questionIds.length) await Question.deleteMany({ _id: { $in: created.questionIds } });
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} pruebas pasaron.`);
  if (skipped.length) console.log(`Omitidas: ${skipped.join('; ')}. Vuelve a correr el script en horario laboral antes de dar el caso por cerrado.`);
  await mongoose.disconnect();
  process.exit(passed === results.length ? 0 : 1);
};

run().catch(async (err) => {
  console.error('Error ejecutando las pruebas:', err.message);
  console.error('Verifica que el servidor esté corriendo (npm start) y que MONGODB_URI apunte a tu base local.');
  try {
    await mongoose.disconnect();
  } catch {
    // sin acción
  }
  process.exit(1);
});
