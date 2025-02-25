const { google } = require('googleapis');
require('dotenv').config();

// Configurar OAuth2 con la URI de redirección correcta
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline', // Para obtener el Refresh Token
  scope: ['https://www.googleapis.com/auth/gmail.send'],
});

console.log('Abre esta URL en tu navegador para autorizar la aplicación:');
console.log(authUrl);