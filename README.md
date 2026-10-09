# 🚀 Skillhub – Backend API

## 📌 Overview
Skillhub Backend is a RESTful API designed to automate corporate ERP training processes.

It manages role-based course assignments, evaluation workflows and approval notifications while enforcing secure authentication and structured access control.

The system emphasizes automation, backend structure and enterprise-oriented logic.

## 🏗 Architecture
The application follows a layered structure:

- Routes → Define API endpoints + Handle business logic  
- Models → MongoDB schemas using Mongoose  
- Middlewares → Authentication & role validation  

This separation ensures scalability and maintainability.

## 🔐 Authentication & Security

- Password hashing using `bcryptjs`  
- JWT-based authentication  
- Role-based authorization middleware  
- Environment-based configuration using `dotenv`  
- Controlled CORS setup
- Helmet security headers and rate limiting on authentication routes

## 👥 Role-Based Access Control (RBAC)

Admin  
- Manage users  
- Manage training materials  
- Manage FAQs  
- Monitor user progress  
- Receive evaluation approval notifications  

Employee  
- Access assigned courses  
- Complete evaluations  
- Track training progress  

Evaluation assignments are automatically generated based on user role.
New accounts start as `pendiente` (no access to material). HR assigns the role from the admin panel. Roles are never derived from user input.

## 📦 Core Modules

- Users Management  
- Training Materials  
- FAQs Management  
- Evaluation Engine  
- Progress Tracking  
- Email Notification System (Nodemailer + Google OAuth2)

## 🛠 Tech Stack
`Node.js` · `Express` · `MongoDB` · `Mongoose`  

`JWT` · `bcryptjs` · `dotenv` · `CORS`  

`Nodemailer` · `Google APIs`  

## ⚙️ Getting Started

### Installation

```bash
git clone https://github.com/EdannyDev/backend-training.git
cd backend-training
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

| Variable         | Description                                      | Example                          |
|-------------------|---------------------------------------------------|-------------------------------------|
| `MONGODB_URI`    | MongoDB connection string                         | `mongodb://localhost:27017/skillhubDB` |
| `PORT`           | Port the server listens on                        | `5000`                              |
| `JWT_SECRET`     | Secret key used to sign JWT tokens                | `your_secret_jwt`                   |
| `EMAIL_USER`     | Gmail address used to send notifications          | `your_email`                        |
| `CLIENT_ID`      | Google OAuth2 client ID                           | `your_client_id_google`             |
| `CLIENT_SECRET`  | Google OAuth2 client secret                       | `your_client_secret_google`         |
| `REFRESH_TOKEN`  | Google OAuth2 refresh token                       | `your_refresh_token_google`         |
| `FRONTEND_URL`   | Frontend origin (used for CORS)                   | `http://localhost:3000`             |
| `SUPPORT_EMAIL`  | Address that receives evaluation notifications    | `soporte@skillhub-app.com`          |
| `LOGO_URL`       | Logo image URL used in notification emails        | `your_logo_url`                     |
| `CLOUDINARY_CLOUD_NAME` | Cloud name of your Cloudinary account (only its URLs are accepted) | `your_cloud_name`                   |

### Running the Server

```bash
node server.js
```

The API will be available at `http://localhost:5000`.

---

Frontend: [frontend-training](https://github.com/EdannyDev/frontend-training) · Author: [@EdannyDev](https://github.com/EdannyDev)