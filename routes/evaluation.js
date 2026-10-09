const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const Evaluation = require('../models/evaluation');
const User = require('../models/user');
const Question = require('../models/question');
const shuffle = require('../utils/shuffle');
const sendMail = require('../utils/sendMail');
const moment = require('moment-timezone');
const meridaTimezone = 'America/Merida';

// Función para verificar si es un día hábil (Lunes a Viernes) en la zona horaria de Mérida
const isBusinessDay = () => {
    const currentDay = moment.tz(meridaTimezone).day();
    return currentDay >= 1 && currentDay <= 5;
};

// Función para obtener los horarios laborales en la zona horaria de Mérida
const getWorkHours = () => {
    const currentTime = moment.tz(meridaTimezone);
    const today = currentTime.format('YYYY-MM-DD');

    return {
        workStartTime: moment.tz(`${today} 08:30`, 'YYYY-MM-DD HH:mm', meridaTimezone),
        workEndTime: moment.tz(`${today} 18:30`, 'YYYY-MM-DD HH:mm', meridaTimezone)
    };
};

// Ruta para enviar respuestas y calcular el score
router.post('/submit', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { answers } = req.body;
        const currentTime = moment.tz(meridaTimezone);
        const { workStartTime, workEndTime } = getWorkHours();

        if (!isBusinessDay()) {
            return res.status(400).json({ error: 'Las evaluaciones solo se pueden presentar de lunes a viernes.' });
        }

        if (currentTime.isBefore(workStartTime) || currentTime.isAfter(workEndTime)) {
            return res.status(400).json({
                error: 'Las evaluaciones solo se pueden presentar dentro del horario laboral (8:30 AM - 6:30 PM, hora de Mérida).'
            });
        }

        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'El formato de respuestas es inválido' });
        }

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'El administrador no puede presentar evaluaciones.' });
        }

        const existingEvaluation = await Evaluation.findOne({ userId }).populate('questions');

        if (!existingEvaluation) {
            return res.status(400).json({ error: 'No tienes una evaluación asignada para presentar.' });
        }

        if (existingEvaluation.status !== 'pendiente') {
            return res.status(400).json({ error: 'La evaluación ya fue presentada.' });
        }

        let correctAnswers = 0;

        existingEvaluation.questions.forEach((question) => {
            const userAnswer = answers.find(ans => ans.questionId === String(question._id));

            if (userAnswer) {
                if (question.type === 'opcion_multiple') {
                    const correctOption = question.options.find(opt => opt.correct);
                    if (correctOption && userAnswer.selectedOption === correctOption.text) {
                        correctAnswers++;
                    }
                } else if (question.type === 'verdadero_falso') {
                    if (userAnswer.selectedOption === question.correctAnswer) {
                        correctAnswers++;
                    }
                }
            }
        });

        const score = (correctAnswers / existingEvaluation.questions.length) * 100;
        const finalStatus = score >= 80 ? 'aprobado' : 'fallado';
        const updated = await Evaluation.findOneAndUpdate(
            { _id: existingEvaluation._id, status: 'pendiente' },
            { $set: { score, status: finalStatus } },
            { new: true }
        );
        if (!updated) {
            return res.status(400).json({ error: 'La evaluación ya fue presentada.' });
        }

        if (finalStatus === 'aprobado') {
            const user = await User.findById(userId);
            await sendMail(user, score);
        }

        return res.json({ message: 'Evaluación registrada correctamente.', score, status: finalStatus });

    } catch (error) {
        console.error('Error en /submit:', error);
        res.status(500).json({ error: 'Error al registrar la evaluación' });
    }
});

// Ruta para obtener los detalles de la evaluación
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'El administrador no puede ver la evaluación.' });
        }
        const evaluation = await Evaluation.findOne({ userId });

        if (!evaluation) {
            return res.status(404).json({ error: 'No se encontró una evaluación para este usuario.' });
        }

        res.json(evaluation);

    } catch (error) {
        console.error('Error en /status:', error);
        res.status(500).json({ error: 'Error al obtener la evaluación' });
    }
});

// Ruta para obtener la evaluación asignada
router.get('/assigned', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        let evaluation = await Evaluation.findOne({ userId }).populate('questions');

        if (!evaluation) {
            return res.status(404).json({ error: 'No tienes una evaluación asignada.' });
        }

        if (evaluation.status !== 'pendiente') {
            return res.status(400).json({ error: 'La evaluación ya fue presentada.' });
        }

        const shuffledQuestions = shuffle(evaluation.questions).map(q => ({
            questionId: q._id,
            text: q.text,
            type: q.type,
            options: q.options ? shuffle(q.options.map(opt => ({
                _id: opt._id,
                text: opt.text
            }))) : undefined
        }));

        res.json({ evaluationId: evaluation._id, questions: shuffledQuestions });

    } catch (error) {
        console.error('Error en /assigned:', error);
        res.status(500).json({ error: 'Error al obtener la evaluación asignada' });
    }
});

//Obtener temporizador de espera entre intentos
router.get('/retry-time', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            return res.json({ isAdmin: true, retryTimestamp: null });
        }

        const evaluation = await Evaluation.findOne({ userId });

        if (!evaluation || !evaluation.retryTimestamp) {
            return res.json({ retryTimestamp: null });
        }

        const currentTime = moment().tz(meridaTimezone);

        if (currentTime.isAfter(evaluation.retryTimestamp)) {
            evaluation.retryTimestamp = null;
            await evaluation.save();
            return res.json({ retryTimestamp: null });
        }

        res.json({ retryTimestamp: evaluation.retryTimestamp });

    } catch (error) {
        console.error('Error en /retry-time:', error);
        res.status(500).json({ error: 'Error al obtener el tiempo de reintento' });
    }
});

// Ruta para intentar nuevamente la evaluación si fue fallada
router.post('/retry', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentTime = moment.tz(meridaTimezone);
        const { workStartTime, workEndTime } = getWorkHours();
        const waitTime = 5 * 60 * 1000;

        if (!isBusinessDay()) {
            return res.status(400).json({ error: 'Solo puedes reintentar la evaluación de lunes a viernes.' });
        }

        if (currentTime.isBefore(workStartTime) || currentTime.isAfter(workEndTime)) {
            return res.status(400).json({
                error: 'Los intentos solo pueden realizarse dentro del horario laboral (8:30 AM a 6:30 PM, hora de Mérida).'
            });
        }

        const hasApproved = await Evaluation.findOne({ userId, status: 'aprobado' });

        if (hasApproved) {
            return res.status(400).json({ error: 'Ya has aprobado la evaluación. No necesitas más intentos.' });
        }

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'El administrador no puede intentar la evaluación.' });
        }

        const evaluation = await Evaluation.findOne({ userId }).populate('questions');

        if (!evaluation) {
            return res.status(400).json({ error: 'No tienes una evaluación asignada para reintentar.' });
        }

        if (evaluation.status !== 'fallado') {
            return res.status(400).json({ error: 'Solo puedes reintentar evaluaciones fallidas.' });
        }

        const lastAttemptTime = moment(evaluation.updatedAt).tz(meridaTimezone);
        const todayStart = workStartTime.clone().startOf('day');
        const todayEnd = workEndTime.clone().endOf('day');

        // Si el último intento fue otro día, el contador de hoy vale 0
        const storedAttempts = evaluation.attempts;
        const attemptsToday = lastAttemptTime.isBetween(todayStart, todayEnd, null, '[]') ? storedAttempts : 0;

        // attempts cuenta solo reintentos: 1 presentación inicial + 2 reintentos = 3 por día
        if (attemptsToday >= 2) {
            return res.status(400).json({
                error: 'Alcanzaste el límite de 3 presentaciones por día. Inténtalo en el siguiente día hábil.'
            });
        }

        const timeSinceLastAttempt = currentTime.diff(lastAttemptTime, 'milliseconds');
        const remainingTime = waitTime - timeSinceLastAttempt;

        if (timeSinceLastAttempt < waitTime) {
            return res.status(400).json({
                error: `Debes esperar ${Math.ceil(remainingTime / (60 * 1000))} minutos antes de intentar de nuevo.`,
                remainingTime
            });
        }

        const pool = await Question.find({ roles: req.user.role });
        const newQuestions = pool.length >= 5
            ? shuffle(pool).slice(0, 5).map(q => q._id)
            : evaluation.questions.map(q => q._id);

        // Atómico: solo un reintento concurrente pasa de 'fallado' a 'pendiente'
        const updated = await Evaluation.findOneAndUpdate(
            { _id: evaluation._id, status: 'fallado', attempts: storedAttempts },
            { $set: { questions: newQuestions, score: 0, status: 'pendiente', attempts: attemptsToday + 1, createdAt: currentTime.toDate() } },
            { new: true }
        );
        if (!updated) {
            return res.status(400).json({ error: 'El reintento ya fue procesado.' });
        }

        res.json({ message: 'Intento de evaluación restablecido.', attemptsLeft: 2 - updated.attempts });

    } catch (error) {
        console.error('Error en /retry:', error);
        res.status(500).json({ error: 'Error al intentar la evaluación nuevamente' });
    }
});

module.exports = router;