require('dotenv').config();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail(user, score) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `"Nyx-Mentor"`,
      to: 'edanuc15@gmail.com',
      subject: 'Evaluación Aprobada',
      text: `El usuario ${user.name} con el correo ${user.email} aprobó su evaluación con una calificación de ${score} puntos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center;">          
          <h2 style="color: #228b22;">Evaluación Aprobada</h2>
          <img src="https://res.cloudinary.com/dsl7stuzv/image/upload/v1756508263/toktsslcqiqrfn04j4db.png" alt="Ultrahogar Logo" style="max-width: 200px; margin-bottom: 20px;">
          <p style="font-size: 16px;">El usuario <strong>${user.name}</strong> con el correo <strong>${user.email}</strong> aprobó su evaluación con una calificación de <strong>${score} puntos</strong>.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #555; font-size: 14px;">Gracias por formar parte de <strong>Ultrahogar</strong>.</p>
          <p style="font-size: 12px; color: #999;">Este es un mensaje generado automáticamente, por favor no respondas a este correo.</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', result);
  } catch (error) {
    console.error('Error al enviar correo:', error);
  }
}

module.exports = sendMail;