const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const Evaluation = require('../models/evaluation');
const Progress = require('../models/progress');
const Question = require('../models/question');
const Training = require('../models/training');
const User = require('../models/user');

// Verificar si un usuario tiene acceso a la capacitación
const hasAccessToTraining = (user, training) => {
    return training.roles.includes(user.role);
};

// Asignar preguntas en la evaluación en base al rol del usuario
const assignEvaluation = async (userId, role) => {
    try {        
        const questions = await Question.find({ roles: role });

        if (!questions || questions.length === 0) {
            console.warn(`No hay preguntas disponibles para el rol ${role}`);
            return;
        }

        const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5).slice(0, 5);

        let evaluation = await Evaluation.findOne({ userId });

        if (!evaluation) {
            evaluation = new Evaluation({
                userId,
                questions: shuffledQuestions.map(q => q._id),
                score: 0,
                status: 'pendiente'
            });

            await evaluation.save();
        }
    } catch (error) {
        console.error("Error asignando evaluación:", error);
    }
};

// Obtener progreso de un usuario
router.get('/view/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.role === 'admin') {
            const progress = await Progress.find({ userId });
            return res.json(progress);
        }
        
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }        

        const progress = await Progress.find({ userId });
        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el progreso' });
    }
});

// Verificar si el usuario ha completado todas las capacitaciones
router.get('/completed/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.role === 'admin' && req.user.id === userId) {
            return res.status(403).json({ error: 'El administrador no puede consultar su progreso.' });
        }

        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const requiredTrainings = await Training.find({ roles: user.role });
        const userProgress = await Progress.find({ userId });

        const allCompleted = requiredTrainings.every(training =>
            userProgress.some(progress => progress.trainingId.equals(training._id) && progress.status === 'completado')
        );
        res.json({ allCompleted });
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar el progreso' });
    }
});

// Iniciar progreso de capacitación
router.post('/start', authenticate, async (req, res) => {
    try {
        const { trainingId, type } = req.body;
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'El administrador no puede iniciar capacitaciones.' });
        }

        const training = await Training.findById(trainingId);
        if (!training) {
            return res.status(404).json({ error: 'Capacitación no encontrada.' });
        }

        if (!hasAccessToTraining(req.user, training)) {
            return res.status(403).json({ error: 'No tienes acceso a esta capacitación.' });
        }

        if (type === 'video' && !training.video.fileUrl) {
            return res.status(400).json({ error: 'Esta capacitación no tiene material de video.' });
        }
        if (type === 'document' && !training.document.fileUrl) {
            return res.status(400).json({ error: 'Esta capacitación no tiene material de documento.' });
        }

        if (type === 'video' && !training.video) {
            return res.status(400).json({ error: 'La capacitación no está asociada a un material de video.' });
        }

        if (type === 'document' && !training.document) {
            return res.status(400).json({ error: 'La capacitación no está asociada a un material de documento.' });
        }

        const existingProgress = await Progress.findOne({ userId, trainingId });
        if (existingProgress) {
            return res.status(400).json({ error: 'Ya tienes un progreso registrado para esta capacitación.' });
        }

        const progress = new Progress({ userId, trainingId, type, status: 'cursando' });
        await progress.save();
        res.json({ message: 'Capacitación iniciada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar sesión de capacitación' });
    }
});

// Registrar progreso de capacitación
router.post('/progress', authenticate, async (req, res) => {
    try {
        const { trainingId, type, progress } = req.body;
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'El administrador no puede registrar su progreso.' });
        }

        const training = await Training.findById(trainingId);
        if (!training) {
            return res.status(404).json({ error: 'Capacitación no encontrada.' });
        }

        if (!hasAccessToTraining(req.user, training)) {
            return res.status(403).json({ error: 'No tienes acceso a esta capacitación.' });
        }

        let session = await Progress.findOne({ userId, trainingId });
        if (!session) {
            session = new Progress({ userId, trainingId, type, progress: 0, status: 'cursando', completed: false });
        }

        if (type === 'video' && !training.video.fileUrl) {
            return res.status(400).json({ error: 'Esta capacitación no tiene material de video.' });
        }
        if (type === 'document' && !training.document.fileUrl) {
            return res.status(400).json({ error: 'Esta capacitación no tiene material de documento.' });
        }

        if (type === 'video' && !training.video) {
            return res.status(400).json({ error: 'La capacitación no está asociada a un material de video.' });
        }

        if (type === 'document' && !training.document) {
            return res.status(400).json({ error: 'La capacitación no está asociada a un material de documento.' });
        }

        if (progress > 100 || progress < 0 || progress < session.progress) {
            return res.status(400).json({ error: 'Progreso inválido.' });
        }

        session.progress = progress;

        if (progress === 100) {
            session.status = 'completado';
            session.completed = true;
        } else {
            session.status = 'cursando';
            session.completed = false;
        }
        await session.save();

        const requiredTrainings = await Training.find({ roles: req.user.role });
        const userProgress = await Progress.find({ userId });

        const allCompleted = requiredTrainings.every(training => 
            userProgress.some(progress => 
                progress.trainingId.equals(training._id) && 
                progress.status === 'completado' &&
                progress.progress === 100 &&
                progress.completed === true
            )
        );

        if (allCompleted) {
            await assignEvaluation(userId, req.user.role);
        }
        res.json({ message: 'Progreso guardado correctamente', progress: session.progress, completed: session.completed });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el progreso' });
    }
});

module.exports = router;