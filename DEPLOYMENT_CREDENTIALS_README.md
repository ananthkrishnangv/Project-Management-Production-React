# CSIR-SERC Project Management Portal - Deployment Details & Credentials

## 📋 System Overview
The **CSIR-SERC Project Management Portal** is a full-stack web application designed for the Council of Scientific and Industrial Research - Structural Engineering Research Centre (CSIR-SERC), Chennai.

---

## 🔐 1. Default User Credentials

These accounts are seeded into the database (via `prisma/seed.ts` and `reset-admin.cjs`):

| Role | Designation / User | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@serc.res.in` | `Admin@SERC2024` *(Reset: `Admin@SERC2025!`)* |
| **Director** | Dr. N Anandavalli (Director) | `director@serc.res.in` | `Director@SERC2024` |
| **Supervisor (BKMD)** | Dr. M.B. Anoop (Chief Scientist) | `supervisor@serc.res.in` | `Supervisor@SERC2024` |
| **Project Head (PI)** | Dr. Saptarshi Sasmal (Sr. Principal Scientist) | `pi@serc.res.in` | `PI@SERC2024` |

> ⚠️ **Note**: In a production environment, all default passwords must be changed immediately after initial setup.

---

## 📧 2. SMTP Email Configuration & Credentials

Configured for notification delivery, deadline alerts, and RC meeting updates:

| Setting | Value |
| :--- | :--- |
| **Email Service** | Google Gmail SMTP |
| **SMTP Host** | `smtp.gmail.com` |
| **SMTP Port** | `587` (STARTTLS) |
| **Username** | `ictserc@gmail.com` |
| **App Password** | `yyhoakynckydyybm` |
| **Sender Email (From)** | `CSIR-SERC Portal <ictserc@gmail.com>` |

---

## 🗄️ 3. Environment & Database Configuration

### Backend `.env` Configuration (`backend/.env`)

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/csir_serc_portal?schema=public"

# JWT Authentication Secrets
JWT_ACCESS_SECRET="csir-serc-access-secret-key-change-in-production-2024"
JWT_REFRESH_SECRET="csir-serc-refresh-secret-key-change-in-production-2024"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Server Settings
PORT=3001
NODE_ENV="production"
FRONTEND_URL="https://portal.serc.res.in"

# SMTP Configuration (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="ictserc@gmail.com"
SMTP_PASS="yyhoakynckydyybm"
SMTP_FROM="CSIR-SERC Portal <ictserc@gmail.com>"

# Currency API (FreeCurrencyAPI)
CURRENCY_API_KEY="fca_live_YOUR_API_KEY_HERE"
CURRENCY_API_URL="https://api.freecurrencyapi.com/v1/latest"

# File Upload Settings
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=52428800

# Two-Factor Authentication
TWO_FA_ISSUER="CSIR-SERC Portal"
```

---

## 🔒 4. Web Server, Reverse Proxy & SSL

- **SSL Certificates**: Available in the project SSL folder:
  - Certificate: `SSL/cert.crt`
  - Private Key: `SSL/cert.key`
- **Reverse Proxy**: Nginx configured as reverse proxy to terminate SSL and forward traffic:
  - Frontend served statically or proxied to web root
  - Backend API requests routed from `/api` to `http://localhost:3001`
  - WebSocket traffic (`/socket.io`) forwarded with upgrade headers
  - Express `trust proxy` enabled for IP rate limiting

---

## 🚀 5. Build & Deployment Steps

### Prerequisites
- Node.js ≥ 22.0.0
- PostgreSQL database running on port 5432
- npm / yarn

### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed          # Seeds default admin, director, supervisor, PI, and verticals
npm run build
npm start                # Starts backend on port 3001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build            # Builds production assets into frontend/dist/
```

---

## 📦 6. Backup Information
- **Backup Created**: August 19, 2026
- **Includes**: Full frontend source, backend source, database schema/seeds, migration scripts, sample data sheets, SSL certificates, environment configurations, and documentation.
