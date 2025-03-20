const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const Evaluation = require('../models/evaluation');
const User = require('../models/user');
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
        existingEvaluation.score = score;
        existingEvaluation.status = score >= 80 ? 'aprobado' : 'fallado';
        await existingEvaluation.save();

        if (existingEvaluation.status === 'aprobado') {
            const user = await User.findById(userId);
            await sendMail(user, score);
        }

        return res.json({ message: 'Evaluación registrada correctamente.', score, status: existingEvaluation.status });

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

        const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
        const shuffledQuestions = shuffleArray(evaluation.questions).map(q => ({
            questionId: q._id,
            text: q.text,
            type: q.type,
            options: q.options ? shuffleArray(q.options.map(opt => ({
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

// Ruta para intentar nuevamente la evaluación si fue fallada
router.post('/retry', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentTime = moment.tz(meridaTimezone);
        const { workStartTime, workEndTime } = getWorkHours();

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

        let evaluation = await Evaluation.findOne({ userId }).populate('questions');

        if (!evaluation) {
            return res.status(400).json({ error: 'No tienes una evaluación asignada para reintentar.' });
        }

        if (evaluation.status !== 'fallado') {
            return res.status(400).json({ error: 'Solo puedes reintentar evaluaciones fallidas.' });
        }

        if (evaluation.attempts >= 3) {
            return res.status(400).json({
                error: 'Has alcanzado el límite de intentos para esta evaluación en la jornada laboral actual.'
            });
        }

        const lastAttemptTime = moment(evaluation.updatedAt).tz(meridaTimezone);
        const timeSinceLastAttempt = currentTime.diff(lastAttemptTime, 'milliseconds');
        const timeLimit = 1 * 60 * 1000;
        const remainingTime = timeLimit - timeSinceLastAttempt;

        if (timeSinceLastAttempt < timeLimit) {
            return res.status(400).json({
                error: `Debes esperar ${Math.ceil(remainingTime / 1000)} segundos para intentar nuevamente.`,
                remainingTime
            });
        }

        evaluation.score = 0;
        evaluation.status = 'pendiente';
        evaluation.attempts += 1;
        evaluation.createdAt = currentTime.toDate();
        await evaluation.save();

        res.json({ message: 'Intento de evaluación restablecido.', attemptsLeft: 3 - evaluation.attempts });

    } catch (error) {
        console.error('Error en /retry:', error);
        res.status(500).json({ error: 'Error al intentar la evaluación nuevamente' });
    }
});

module.exports = router;