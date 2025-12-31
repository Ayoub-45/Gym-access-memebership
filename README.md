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

## 🧪 Running Tests

### Prerequisites
- PostgreSQL installed and running
- sudo access for database operations

### One-command test setup and execution:
```bash
cd backend
chmod +x testsetup.sh
./testsetup.sh
```

### Frontend Test:
```bash
cd Frontend
chmod +x testsetup.sh
./testsetup.sh
```

