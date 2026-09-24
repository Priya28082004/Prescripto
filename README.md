# 🏥 Prescripto - Full Stack Doctor Appointment & Hospital Management System

A comprehensive healthcare management and doctor appointment booking platform built with the MERN stack (MongoDB, Express.js, React, Node.js), Socket.io for real-time messaging, and Cloudinary for media storage.

---

## 🚀 Live Deployments

| Service | Deployment Link | Platform |
| :--- | :--- | :--- |
| **Frontend (Patient Portal)** | [https://prescripto-delta-pied.vercel.app](https://prescripto-delta-pied.vercel.app) | **Vercel** |
| **Admin & Doctor Portal** | [https://prescripto-e96z.vercel.app](https://prescripto-e96z.vercel.app) | **Vercel** |
| **Backend API** | Deployed on Render | **Render** |

---

## ✨ Features

### 👤 Patient Portal (Frontend)
- Browse verified doctors filtered by specialty (General physician, Gynecologist, Dermatologist, Pediatricians, Neurologist, Gastroenterologist).
- Real-time appointment booking with date & time slots.
- Secure online payment integration (Stripe & Razorpay) and Cash on Delivery options.
- Support Hub with AI-powered chat assistance, support ticket creation, and realtime emergency alerts.
- Patient profile management with medical record tracking.
- Family and Nurse portal access for patient admissions and updates.

### 🛡️ Admin & Doctor Portal
- **Admin Dashboard**: Overview of total doctors, appointments, patients, hospital beds, and revenue analytics.
- **Doctor Management**: Add, update availability, and manage doctor profiles.
- **Appointment Tracking**: Confirm, cancel, and manage completed appointments.
- **Unified Support Inbox**: Real-time patient incoming call handling, emergency triggers, and ticketing support.
- **Hospital Bed & Inpatient Management**: Inpatient admission, ward allocation, daily treatment logs, and billing.

---

## 🛠️ Tech Stack

- **Frontend & Admin**: React.js, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React, React Toastify, Socket.io-client
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.io, JWT Authentication, Multer, Cloudinary, Nodemailer
- **Payments**: Razorpay, Stripe
- **AI Integration**: Google Generative AI (Gemini)

---

## 📁 Repository Structure

```text
├── frontend/        # React + Vite client app for patients
├── admin/           # React + Vite dashboard for doctors & admin
├── backend/         # Express.js REST API with Socket.io & MongoDB
└── README.md        # Project documentation & live links
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
CURRENCY=INR
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_SECRET_KEY=your_stripe_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (`frontend/.env`)
```env
VITE_BACKEND_URL=https://<your-backend-service>.onrender.com
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

### Admin (`admin/.env`)
```env
VITE_BACKEND_URL=https://<your-backend-service>.onrender.com
VITE_CURRENCY=₹
```

---

## 💻 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Priya28082004/Prescripto.git
   cd Prescripto
   ```

2. **Run Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Run Patient Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Run Admin & Doctor Panel:**
   ```bash
   cd admin
   npm install
   npm run dev
   ```

---

## 📄 License
This project is licensed under the ISC License.
