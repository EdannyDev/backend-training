# 🚀 Training Management System – Backend API

## 📌 Overview
Training Management Backend is a RESTful API designed to automate corporate ERP training processes.

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

## 👥 Role-Based Logic

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

## ⚙️ Local Setup

```bash
git clone https://github.com/EdannyDev/backend-training.git  
npm install  
npm start
```  

## 🧾 Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/trainingDB
PORT=5000
JWT_SECRET=tu_secreto_jwt
EMAIL_USER=tu_email
CLIENT_ID=tu_client_id_google
CLIENT_SECRET=tu_client_secret_google
REFRESH_TOKEN=tu_refresh_token_google
FRONTEND_URL=http://localhost:3000
```
