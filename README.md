# 🏛️ CSIR-SERC Project Management & Intelligence Portal (2026 Standard)

![CSIR Logo](docs/screenshots/06_csir_logo.jpg)

> **Official Research Project Governance, Multi-Currency Financials, RC Meetings & Milestone Intelligence Portal**  
> Developed for **CSIR - Structural Engineering Research Centre (CSIR-SERC)**, Chennai, India.  
> Target Production Server: `https://10.10.200.36` (`https://pms.serc.res.in`)

---

## 🌟 Visual Showcase & UI Reference Gallery

The portal has been completely overhauled with a modern **Fluent 2 Glossy & Glassmorphic design system**, featuring frosted sidebars, real-time KPI metrics, Earned Value Management (EVM), 5x5 Risk Heatmap matrices, and interactive Gantt milestone schedules.

### 1. Executive Intelligence & Portfolio Analytics
![Executive Intelligence Dashboard](docs/screenshots/02_executive_intelligence.png)
*High-impact 8 KPI cards, EVM analytics (PV, EV, AC, CPI, SPI, EAC), 5x5 interactive risk matrix, and dual-line budget vs. actual spend trend.*

---

### 2. Trackline Project Schedule & Segmented Performance
![Trackline Dashboard](docs/screenshots/01_dashboard_trackline.png)
*Frosted sidebar layout, workspace switcher, segmented multi-colored task bars, interactive Gantt milestone pills, and expandable subtask table.*

---

### 3. Fluent UI 2 Glossy Neomorphic Design
![Fluent UI 2 Glossy UI](docs/screenshots/04_fluent_glassy_ui.png)
*Translucent frosted glass cards (`backdrop-blur-xl`), glossy gradient borders, and interactive workload chill-to-busy capacity slider.*

---

### 4. SaaS Workflow & Activity Center
![SaaS Workflow](docs/screenshots/03_saas_workflow.png)
*Streamlined proposal pipelines, quick actions, and side activity drawer for real-time notification alerts.*

---

### 5. Campus Heritage
![CSIR-SERC Campus](docs/screenshots/05_main_building.png)
*CSIR - Structural Engineering Research Centre Main Building Campus, Taramani, Chennai.*

---

## 🔑 Production Deployment Details & System Credentials

> ⚠️ **CONFIDENTIAL INSTITUTIONAL RECORD**: Ensure access controls are strictly maintained.

### 🖥️ 1. Server & Host Infrastructure

| Item | Details |
| :--- | :--- |
| **Server Host IP** | `10.10.200.36` |
| **Domain / Hostname** | `pms.serc.res.in` |
| **SSH User** | `root` |
| **SSH Password** | `Dda5a3d52a#4815` |
| **SSH Port** | `22` |
| **Nginx Web Root** | `/var/www/pms.serc.res.in/` |
| **Backend App Directory** | `/opt/csir-serc-portal/backend/` |
| **PM2 Process Name** | `csir-serc-portal` |
| **Node.js Runtime** | `v22.x LTS` (Server) / `v24.x LTS` (Client/Local) |
| **SSL Certificate Path** | `/etc/nginx/ssl/cert.crt` & `/etc/nginx/ssl/cert.key` |

---

### 👥 2. Portal User Roles & Login Credentials

| Role | Name / Designation | Email Address | Password | Default Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | Administrator | `admin@serc.res.in` | `Admin@SERC2025!` | Full system governance, user management, audit logs, backup |
| **Director** | Director, CSIR-SERC | `director@serc.res.in` | `Director@SERC2024` | Executive approvals, DG dashboard, RC sanctions, portfolio review |
| **Supervisor / HoD** | Division Supervisor | `supervisor@serc.res.in` | `Supervisor@SERC2024` | BKMD review, budget change approvals, milestone tracking |
| **Project Head (PI)** | Principal Investigator | `pi@serc.res.in` | `PI@SERC2024` | Proposal submission, project execution, milestone & expense entry |
| **Default User PW** | Imported Scientists | `*@serc.res.in` | `SERC@2025!` | Profile management, journal notes, deliverable uploads |

---

### 🗄️ 3. Database Configuration (PostgreSQL)

| Parameter | Configuration Value |
| :--- | :--- |
| **Database Engine** | PostgreSQL 15+ |
| **Host & Port** | `localhost:5432` |
| **Database Name** | `csir_serc_portal` |
| **Database User** | `postgres` |
| **Database Password** | `postgres` |
| **Prisma Connection String** | `postgresql://postgres:postgres@localhost:5432/csir_serc_portal?schema=public` |

---

### 📧 4. Email & Notification SMTP (Gmail)

| Parameter | Configuration Value |
| :--- | :--- |
| **SMTP Host** | `smtp.gmail.com` |
| **SMTP Port** | `587` (STARTTLS) |
| **SMTP User** | `ictserc@gmail.com` |
| **SMTP App Password** | `yyhoakynckydyybm` |
| **Sender Header** | `CSIR-SERC Portal <ictserc@gmail.com>` |

---

## 🚀 2026 Core Component Upgrades & Technology Stack

| Layer | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `18.3.1` | Concurrent rendering with modern state hooks |
| **Design System** | Fluent UI 2 & Icons | `9.57.0` / `2.0.260` | Microsoft Fluent 2 component tokens & glossy styling |
| **Iconography** | Lucide React | `0.475.0` | Comprehensive crisp UI iconography |
| **Data Visualization** | Chart.js & react-chartjs-2 | `4.4.7` / `5.3.0` | Dynamic line charts, donuts, radial gauges, and risk matrices |
| **Gantt Charts** | DHTMLX Gantt | `8.0.10` | Project timeline and deliverable schedule roadmaps |
| **Build Engine** | Vite | `6.1.0` | Ultra-fast frontend bundler with WASM fallbacks |
| **Backend Server** | Express.js | `4.21.2` | High-throughput REST API server with rate limiting |
| **Database ORM** | Prisma Client & CLI | `6.3.0` | Type-safe PostgreSQL integration with binary/WASM engines |
| **Language** | TypeScript | `5.7.3` | Strict type validation across both backend and frontend |

---

## 📁 Repository Structure

```
csir-serc-portal/
├── backend/                        # Express.js & Prisma REST API Server
│   ├── prisma/
│   │   └── schema.prisma           # Database Schema (Projects, Milestones, Budgets, Users, RC)
│   ├── src/
│   │   ├── controllers/            # REST Controllers (Auth, Projects, Proposals, Finance, RC)
│   │   ├── middleware/             # JWT Authentication, Role Guards, Rate Limiting
│   │   ├── routes/                 # API Endpoints Router
│   │   └── index.ts                # Express App Initialization & Security Setup
│   └── package.json
│
├── frontend/                       # React 18 + Fluent 2 + Vite Application
│   ├── src/
│   │   ├── components/             # Reusable UI Widgets, Gantt Charts, Todo Lists
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx # Trackline Frosted Glass Sidebar & Top Bar
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   # Executive Intelligence Dashboard (8 KPIs, EVM, 5x5 Heatmap)
│   │   │   ├── ProjectsPage.tsx    # Research Projects Directory (Grid & Expandable List)
│   │   │   ├── ProjectDetailPage.tsx # 7-Tab Project Console (Milestones, Expenses, Documents)
│   │   │   ├── ProposalPage.tsx    # 5-Stage Proposal Lifecycle Pipeline
│   │   │   ├── ProposalReviewPage.tsx # Proposal Appraisal & Convert to Live Project
│   │   │   ├── FinancePage.tsx     # Dual Currency (INR/USD), Budget Register & Change Requests
│   │   │   ├── StaffPage.tsx       # Scientific & Technical Staff Directory
│   │   │   ├── RCMeetingsPage.tsx  # Research Council Session Countdown & Agenda Manager
│   │   │   ├── DocumentsPage.tsx   # Document Vault with SHA-256 Hash Verification
│   │   │   ├── ReportsPage.tsx     # Executive Reports & High-Res PNG Chart Exports
│   │   │   └── TimelinePage.tsx    # Visual Timeline & Milestone Gantt Roadmap
│   │   ├── stores/                 # Zustand Global State (Auth, Tokens, Preferences)
│   │   └── index.css               # Fluent 2 Glassmorphism & Glossy Design Tokens
│   ├── vite.config.ts
│   └── package.json
│
├── docs/
│   └── screenshots/                # UI Showcase Screenshots & Media Assets
├── DEPLOYMENT_CREDENTIALS_README.md# Detailed Credentials Reference
├── deploy.sh                       # Automated Server Deployment Script for 10.10.200.36
└── README.md                       # Main Documentation
```

---

## 🛠️ Quick Start & Build Instructions

### 1. Local Development Setup
```bash
# Clone the repository
git clone https://github.com/ananthkrishnangv/CSIR-SERC-Project-Management-System.git
cd CSIR-SERC-Project-Management-System

# Start Backend
cd backend
npm install
npx prisma generate
npm run dev

# Start Frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev
```

### 2. Production Build
```bash
# Compile Backend
cd backend
npm run build

# Build Frontend Assets
cd ../frontend
npm run build
```

---

## 🌐 Server Deployment Commands (`10.10.200.36`)

To update and redeploy on the production server:

```bash
# SSH into the server
ssh root@10.10.200.36

# Navigate to project directory
cd /opt/csir-serc-portal

# Execute the automated deployment script
chmod +x deploy.sh
./deploy.sh

# Check PM2 service status
pm2 status csir-serc-portal
pm2 logs csir-serc-portal --lines 20 --nostream
```

---

## 📜 License & Compliance

© 2026 **CSIR - Structural Engineering Research Centre (CSIR-SERC)**.  
Council of Scientific and Industrial Research, Government of India. All rights reserved.
