# Gym Access Membership

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/Ayoub-45/Gym-access-memebership.git
cd Gym-access-memebership
```

### 2. Setup Database
```bash
cd backend
./database/setup.sh
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 5. Run the Application

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3001
```

### 6. Access the Application

- Frontend: http://localhost:3001
- Backend API: http://localhost:5000

## Default Credentials

After setup, you can create a new account at http://localhost:3001/signup

---

## 🧪 Testing & Coverage

This project includes automated tests for both the **backend** and **frontend**.

---

### 🔧 Backend Tests (Jest)

The backend uses **Jest** for unit and integration testing with a dedicated test database.

#### Run backend tests with coverage
```bash
cd backend
npm test -- --coverage

### 🖥 Frontend Tests (Cypress – E2E)

The frontend uses **Cypress** for End-to-End (E2E)

#### Run backend tests with coverage
```bash
cd frontend
npx cypress open

npx cypress run
