const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Verificar si las variables de entorno están definidas
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? 'OK' : 'NO DEFINIDO');
console.log('REFRESH_TOKEN:', process.env.REFRESH_TOKEN ? 'OK' : 'NO DEFINIDO');
console.log('EMAIL_USER:', process.env.EMAIL_USER);

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const USER_EMAIL = process.env.EMAIL_USER;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !USER_EMAIL) {
  console.error('ERROR: Falta una o más variables de entorno. Revisa tu archivo .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendMail = async (to, subject, text) => {
  try {
    console.log('Preparando envío de correo...');
    const accessToken = await oauth2Client.getAccessToken();
    console.log('Access Token obtenido:', accessToken?.token || 'No disponible');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: USER_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `NyxMentor <${USER_EMAIL}>`,
      to,
      subject,
      text,
    };

    console.log('Enviando correo a:', to);
    const result = await transporter.sendMail(mailOptions);
    console.log('Correo enviado con éxito:', result.accepted);
    return result;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw new Error('No se pudo enviar el correo');
  }
};

module.exports = sendMail;