🚀Training App - Backend

📌Descripción
Este es el backend del sistema de capacitación para el ERP empresarial.
Proporciona las APIs necesarias para que el frontend gestione cursos, usuarios, FAQs y evaluaciones.

Funcionalidades principales:
-Gestión de usuarios y roles.
-Gestión de cursos de capacitación y FAQs.
-Asignación automática de evaluaciones según el rol del usuario.
-Envío de notificaciones por correo electrónico a los administradores cuando un usuario aprueba una evaluación, incluyendo puntaje y detalles.
-Autenticación segura y manejo de permisos mediante JWT.

🛠️Tecnologías utilizadas
-Node.js
-Express (Framework para APIs REST)
-MongoDB / Mongoose (Base de datos NoSQL y modelado de datos)
-CORS (para permitir solicitudes desde el frontend)
-JWT (Autenticación y autorización)
-bcryptjs (Encriptación de contraseñas)
-crypto (Generación de tokens y seguridad)
-dotenv (Variables de entorno)
-Nodemailer & Google APIs (Envío de correos electrónicos)

⚙️Instalación y ejecución

1.-Clonar el repositorio:
git clone https://github.com/EdannyDev/backend-training.git

2.-Instalar dependencias:
npm install

3.-Crear un archivo .env en la raíz del proyecto con las siguientes variables:
MONGODB_URI=mongodb://localhost:27017/trainingDB
PORT=5000
JWT_SECRET=<tu_secreto_jwt>
EMAIL_USER=<tu_email>
CLIENT_ID=<tu_client_id_google>
CLIENT_SECRET=<tu_client_secret_google>
REFRESH_TOKEN=<tu_refresh_token_google>
FRONTEND_URL=http://localhost:3000

Nota: Reemplaza <tu_secreto_jwt>, <tu_email>, <tu_client_id_google>, <tu_client_secret_google> y <tu_refresh_token_google> por tus valores reales.

4.-Ejecutar la aplicación:
npm start

5.-La API estará disponible en:
http://localhost:5000

✨Endpoints principales
Evaluaciones - /api/evaluations
Módulo de FAQs - /api/faqs
Progresos de capacitación - /api/progress
Material de capacitación - /api/trainings
Usuarios - /api/users

🔗Enlaces útiles
Frontend: https://github.com/EdannyDev/training-app
