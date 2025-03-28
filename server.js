const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const evaluationRoutes = require('./routes/evaluation');
const faqRoutes = require('./routes/faq');
const progressRoutes = require('./routes/progress');
const trainingRoutes = require('./routes/training');
const userRoutes = require('./routes/user');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['http://10.147.20.174', 'http://10.147.20.13'];

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
};

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors(corsOptions));

// Conexión a la base de datos MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión a MongoDB exitosa'))
  .catch(() => console.error('Error al conectar a MongoDB'));

// Rutas de la API
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/users', userRoutes);

// Configuración del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));