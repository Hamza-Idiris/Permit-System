# Digital Building Permit System (Permit-System)

An integrated full-stack solution designed for **Banadir Regional Administration (BRA)** to streamline and digitize the application, approval, payment, and field verification processes for building permits in Mogadishu.

---

## 🚀 Tech Stack

- **Frontend (Web Portal):** React.js, Tailwind CSS
- **Backend (API):** Node.js, Express.js, MongoDB
- **Mobile Application:** Flutter, Dart (Field Verification & User App)

---

## 📁 Repository Structure

```text
Permit-System/
├── backend/          # Node.js & Express API Service
├── frontend/         # React Web Application (Admin & Applicant Dashboard)
└── permit_app/       # Flutter Mobile Application
```

---

## 🛠️ Getting Started & Installation Guide

Follow these simple steps to set up and run each component of the project locally.

### 1. Prerequisites
Ensure you have the following installed on your environment:
- **Node.js** (v18 or higher) & **npm**
- **Flutter SDK** (v3.0 or higher) & Android Studio / VS Code
- **MongoDB** (Local instance or Atlas Connection URI)

---

### 2. Backend Setup (Node.js API)

Open a terminal and execute the following commands:

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the development server
npm start
# or: npm run dev
```

> **Note:** Make sure to set up your `.env` file inside the `backend/` directory (e.g., `PORT`, `MONGO_URI`, `JWT_SECRET`).

---

### 3. Frontend Setup (React Web Portal)

Open a **new terminal** window and run:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React application
npm start
```
The web portal will run on `http://localhost:3000`.

---

### 4. Mobile App Setup (Flutter App)

Open another **new terminal** window and navigate to the mobile app directory:

```bash
# Navigate to Flutter app directory
cd permit_app

# Fetch required packages
flutter pub get

# Run the application (Ensure an emulator or physical device is connected)
flutter run
```

---

## ✨ Key Features

- **Digital Permit Application:** Online submission of construction plans and legal documents.
- **EVC-Plus Payment Integration:** Seamless automated payment workflow for permit fees.
- **Role-Based Dashboards:** Administrative, engineering, and applicant interfaces.
- **QR Code Mobile Inspection:** Mobile app capability for field inspectors to verify building permits on-site.

---

## 👥 Authors & Contributors

Developed as part of the Final Year Thesis Project at **Jamhuriya University of Science and Technology (JUST)** for **Banadir Regional Administration (BRA)**.

| Candidate Name | Core Role & Responsibilities |
| :--- | :--- |
| **Hamza Mohamed Idiris** | **Lead Software Architect & Full-Stack Developer**<br>*(System Architecture, Node.js Backend, Flutter App, EVC-Plus Integration)* |
| **Anas Abdi Dahir** | **Co-Lead Developer & Frontend Specialist**<br>*(React Web Portal, UI/UX Design, State Management)* |
| **Mohamed Ali Said** | **Database Administrator & API Integration**<br>*(MongoDB Schema Design, REST APIs, System Testing)* |
| **Aisha Abdi Ahmed** | **Quality Assurance & User Documentation**<br>*(Usability Testing, Functional Validation, Manuals)* |
| **Abdinour Omar Hussein** | **Project Coordinator & System Requirements**<br>*(Data Collection, SRS Documentation, Stakeholder Alignment)* |

---

## 📄 License

This project is developed for academic and institutional evaluation. All rights reserved.
