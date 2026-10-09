const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const evaluationRoutes = require('./routes/evaluation');
const faqRoutes = require('./routes/faq');
const progressRoutes = require('./routes/progress');
const trainingRoutes = require('./routes/training');
const userRoutes = require('./routes/user');

dotenv.config();
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(express.json({ limit: '10kb' }));
app.use(cors(corsOptions));

// Límite de intentos en rutas de autenticación (100 por 15 minutos por IP; una oficina comparte IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});
['login', 'register', 'forgot-password', 'reset-password'].forEach((route) =>
  app.use(`/api/users/${route}`, authLimiter)
);

// Conexión a la base de datos MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión a MongoDB exitosa'))
  .catch(() => console.error('Error al conectar a MongoDB'));

// Ruta inicial del backend
app.get('/', async (req, res) => {
  res.json({ message: 'Bienvenido al servidor backend de Skillhub' });
});

// Rutas de la API
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/users', userRoutes);

// Configuración del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));