# CSIR-SERC Project Management Portal - Complete Walkthrough

**Version:** 1.0.0  
**Last Updated:** December 31, 2024  
**Organization:** CSIR-Structural Engineering Research Centre, Chennai

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Architecture](#database-architecture)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Module Breakdown](#module-breakdown)
7. [API Structure](#api-structure)
8. [Frontend Architecture](#frontend-architecture)
9. [Security Features](#security-features)
10. [Real-time Features](#real-time-features)
11. [Deployment Architecture](#deployment-architecture)

---

## Executive Summary

The **CSIR-SERC Project Management Portal** is a comprehensive web-based application designed to streamline the management of research projects at the Council of Scientific and Industrial Research - Structural Engineering Research Centre. The portal provides end-to-end project lifecycle management, including:

- 📊 **Project Tracking**: Monitor Grant-in-Aid (GAP), Consultancy (CNP), and Other Lab Projects (OLP)
- 💰 **Financial Management**: Budget allocation, expense tracking, and multi-currency support (INR/USD)
- 👥 **Staff Management**: Role-based access with hierarchical permissions
- 📅 **Research Council (RC) Meetings**: Agenda management, minutes recording, and project reviews
- 📁 **Document Management**: Secure file storage with version control
- 📈 **Reporting & Analytics**: Real-time dashboards and progress tracking
- 🔔 **Notifications**: Deadline alerts, budget warnings, and MoU expiry reminders

---

## System Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
        B[Mobile Browser]
    end

    subgraph "Frontend - React SPA"
        C[React 18 + TypeScript]
        D[React Router v7]
        E[Zustand State]
        F[Fluent UI Components]
        G[Chart.js / DHTMLX Gantt]
    end

    subgraph "API Gateway"
        H[Express.js Server]
        I[Rate Limiting]
        J[CORS / Helmet]
    end

    subgraph "Backend Services"
        K[Authentication Controller]
        L[Project Controller]
        M[Finance Controller]
        N[Document Controller]
        O[RC Meeting Controller]
        P[Dashboard Controller]
    end

    subgraph "Middleware Layer"
        Q[JWT Authentication]
        R[Role-Based Access Control]
        S[Request Validation - Zod]
        T[File Upload - Multer]
    end

    subgraph "Real-time Layer"
        U[Socket.IO Server]
    end

    subgraph "Data Layer"
        V[(PostgreSQL Database)]
        W[Prisma ORM]
        X[File Storage]
    end

    subgraph "External Services"
        Y[SMTP Email Server]
        Z[Currency API]
    end

    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    C -.-> U
    H --> I
    H --> J
    H --> Q
    Q --> R
    R --> S
    S --> K
    S --> L
    S --> M
    S --> N
    S --> O
    S --> P
    K --> W
    L --> W
    M --> W
    N --> W
    N --> T
    T --> X
    O --> W
    P --> W
    W --> V
    K --> Y
    M --> Z
    U -.-> C
```

### Request Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API Gateway
    participant Middleware
    participant Controller
    participant Prisma
    participant PostgreSQL

    User->>Frontend: Action (e.g., Create Project)
    Frontend->>API Gateway: HTTP Request + JWT Token
    API Gateway->>Middleware: Validate Token
    Middleware->>Middleware: Check Role Permissions
    Middleware->>Controller: Authorized Request
    Controller->>Prisma: Database Query
    Prisma->>PostgreSQL: SQL Query
    PostgreSQL-->>Prisma: Query Result
    Prisma-->>Controller: Typed Data
    Controller-->>API Gateway: JSON Response
    API Gateway-->>Frontend: HTTP Response
    Frontend-->>User: Updated UI
```

---

## Technology Stack

### Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Runtime** | Node.js | ≥22.0.0 | JavaScript runtime |
| **Framework** | Express.js | 4.21.2 | Web application framework |
| **Language** | TypeScript | 5.7.2 | Type-safe development |
| **ORM** | Prisma | 6.1.0 | Database abstraction layer |
| **Database** | PostgreSQL | Latest | Relational database |
| **Authentication** | jsonwebtoken | 9.0.2 | JWT token generation |
| **Password Hashing** | Argon2 | 0.41.1 | Secure password hashing |
| **2FA** | otplib | 12.0.1 | TOTP-based two-factor auth |
| **Validation** | Zod | 3.24.1 | Schema validation |
| **File Upload** | Multer | 1.4.5 | Multipart form handling |
| **Email** | Nodemailer | 6.9.16 | SMTP email sending |
| **Real-time** | Socket.IO | 4.8.1 | WebSocket communication |
| **Security** | Helmet | 8.0.0 | HTTP security headers |
| **Rate Limiting** | express-rate-limit | 7.5.0 | API rate limiting |

### Frontend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 18.3.1 | UI library |
| **Build Tool** | Vite | 6.0.5 | Fast development server |
| **Language** | TypeScript | 5.6.2 | Type-safe development |
| **Routing** | React Router | 7.1.1 | Client-side routing |
| **State Management** | Zustand | 5.0.2 | Lightweight state management |
| **UI Components** | Fluent UI | 9.56.5 | Microsoft design system |
| **Icons** | Fluent UI Icons | 2.0.258 | Icon library |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **Charts** | Chart.js | 4.4.7 | Data visualization |
| **Gantt Charts** | DHTMLX Gantt | 8.0.10 | Project timeline visualization |
| **WebSocket** | Socket.IO Client | 4.8.1 | Real-time updates |

---

## Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : has
    USER ||--o{ PROJECT : heads
    USER ||--o{ PROJECT_STAFF : member_of
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : creates
    USER ||--o{ DOCUMENT : uploads
    USER ||--o{ RC_MINUTES : creates

    VERTICAL ||--o{ PROJECT : contains
    SPECIAL_AREA ||--o{ PROJECT : contains

    PROJECT ||--o{ PROJECT_STAFF : has_members
    PROJECT ||--o{ MILESTONE : has
    PROJECT ||--o{ BUDGET : has
    PROJECT ||--o{ EXPENSE : has
    PROJECT ||--o{ DOCUMENT : has
    PROJECT ||--o{ MOU : has
    PROJECT ||--o{ PROJECT_OUTPUT : produces
    PROJECT ||--o{ RC_AGENDA_ITEM : discussed_in
    PROJECT ||--o{ CASH_FLOW : tracks

    RC_MEETING ||--o{ RC_AGENDA_ITEM : contains
    RC_MEETING ||--o{ RC_MINUTES : has

    USER {
        uuid id PK
        string email UK
        string password
        string firstName
        string lastName
        string designation
        string phone
        UserRole role
        boolean isActive
        boolean twoFactorEnabled
        string twoFactorSecret
        string profileImage
        datetime lastLogin
    }

    PROJECT {
        uuid id PK
        string code UK
        string title
        text description
        ProjectCategory category
        uuid verticalId FK
        uuid specialAreaId FK
        uuid projectHeadId FK
        ProjectStatus status
        date startDate
        date endDate
        text objectives
        text methodology
        text expectedOutcome
        int progress
        boolean isRCReviewed
    }

    MILESTONE {
        uuid id PK
        uuid projectId FK
        string title
        text description
        date startDate
        date endDate
        MilestoneStatus status
        int progress
        int order
    }

    BUDGET {
        uuid id PK
        uuid projectId FK
        string fiscalYear
        string category
        float amountINR
        float amountUSD
        float exchangeRate
        float utilized
    }

    EXPENSE {
        uuid id PK
        uuid projectId FK
        string description
        string category
        float amount
        Currency currency
        float amountINR
        float exchangeRate
        string vendor
        string invoiceNumber
    }

    DOCUMENT {
        uuid id PK
        uuid projectId FK
        uuid uploadedById FK
        DocumentType type
        string title
        string fileName
        string filePath
        int fileSize
        string mimeType
        string sha256Hash
        int version
    }

    MOU {
        uuid id PK
        uuid projectId FK
        string partnerName
        string partnerType
        string title
        date signedDate
        date expiryDate
        boolean isActive
        boolean alertSent
    }

    RC_MEETING {
        uuid id PK
        string title
        int meetingNumber
        datetime date
        string venue
        RCMeetingStatus status
    }

    RC_AGENDA_ITEM {
        uuid id PK
        uuid meetingId FK
        uuid projectId FK
        int itemNumber
        string title
        string type
        string presenter
        int duration
        string status
    }
```

### Database Models Summary

| Model | Description | Key Fields |
|-------|-------------|------------|
| **User** | Portal users with authentication | email, password, role, 2FA settings |
| **RefreshToken** | JWT refresh token storage | token, userId, expiresAt |
| **Vertical** | Research verticals (WE, TT, SHM, etc.) | name, code, description |
| **SpecialArea** | Special research focus areas | name, description |
| **Project** | Research projects | code, title, category, status, dates |
| **ProjectStaff** | Project team members | projectId, userId, role |
| **Milestone** | Project phases/milestones | title, dates, status, progress |
| **Budget** | Financial allocations | fiscalYear, category, amounts |
| **Expense** | Actual expenditures | amount, currency, vendor, invoice |
| **CashFlow** | Money received/utilized | type, source, amount |
| **Document** | Uploaded files | type, filePath, sha256Hash |
| **MoU** | Memoranda of Understanding | partner, dates, expiry alerts |
| **ProjectOutput** | Publications, patents, etc. | type, title, authors, DOI |
| **RCMeeting** | Research Council meetings | meetingNumber, date, status |
| **RCAgendaItem** | Meeting agenda items | itemNumber, type, presenter |
| **RCMinutes** | Meeting minutes | content, version, isFinal |
| **Notification** | User alerts | type, title, message, isRead |
| **AuditLog** | Activity tracking | action, entity, oldValue, newValue |
| **ExternalFeedback** | External user feedback | rating, feedback |
| **SystemConfig** | System settings | key, value |
| **CurrencyRate** | Exchange rates | baseCurrency, targetCurrency, rate |

---

## User Roles & Permissions

### Role Hierarchy

```mermaid
graph TD
    A[ADMIN] --> B[DIRECTOR]
    B --> C[SUPERVISOR / BKMD]
    C --> D[PROJECT_HEAD / PI]
    D --> E[EMPLOYEE / Scientist]
    F[EXTERNAL_OWNER] --> G[Limited Access]

    style A fill:#e74c3c,color:#fff
    style B fill:#3498db,color:#fff
    style C fill:#2ecc71,color:#fff
    style D fill:#f39c12,color:#fff
    style E fill:#9b59b6,color:#fff
    style F fill:#95a5a6,color:#fff
```

### Permission Matrix

| Resource | ADMIN | DIRECTOR | SUPERVISOR | PROJECT_HEAD | EMPLOYEE | EXTERNAL |
|----------|:-----:|:--------:|:----------:|:------------:|:--------:|:--------:|
| **Users - Create** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Users - Read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Users - Update** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Users - Delete** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Projects - Create** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Projects - Read** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Projects - Update** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Projects - Approve** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Finance - Create** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Finance - Read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Finance - Approve** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **RC Meetings - Create** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **RC Meetings - Read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Documents - Upload** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Documents - Read** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reports - Generate** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Settings - Modify** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Module Breakdown

### 1. Authentication Module

**Purpose:** Secure user authentication with 2FA support

**Features:**
- Email/password login
- JWT access & refresh tokens
- Two-Factor Authentication (TOTP)
- Password reset via email
- Session management

**Key Files:**
- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/middleware/auth.middleware.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/stores/authStore.ts`

---

### 2. Dashboard Module

**Purpose:** Real-time overview and analytics

**Features:**
- Project statistics by status/category
- Financial overview (budgets vs. expenses)
- Recent activities timeline
- Deadline alerts
- MoU expiry warnings
- Quick action buttons

**Key Files:**
- `backend/src/controllers/dashboard.controller.ts`
- `backend/src/routes/dashboard.routes.ts`
- `frontend/src/pages/DashboardPage.tsx`

---

### 3. Project Management Module

**Purpose:** Complete project lifecycle management

**Features:**
- Create/edit projects (GAP, CNP, OLP)
- Assign project head and staff
- Track milestones and progress
- Gantt chart visualization
- Status workflow management

**Key Files:**
- `backend/src/controllers/project.controller.ts`
- `backend/src/routes/project.routes.ts`
- `frontend/src/pages/ProjectsPage.tsx`
- `frontend/src/pages/ProjectDetailPage.tsx`

---

### 4. Finance Module

**Purpose:** Budget and expense management

**Features:**
- Budget allocation by fiscal year
- Expense tracking with receipt upload
- Multi-currency support (INR/USD)
- Real-time exchange rates
- Utilization certificates
- Cash flow tracking

**Key Files:**
- `backend/src/controllers/finance.controller.ts`
- `backend/src/routes/finance.routes.ts`
- `frontend/src/pages/FinancePage.tsx`

---

### 5. Document Management Module

**Purpose:** Secure file storage and management

**Features:**
- Multiple document types (reports, photos, videos, MoUs)
- Version control
- SHA-256 integrity verification
- Access control per document
- 50MB max file size

**Key Files:**
- `backend/src/controllers/document.controller.ts`
- `backend/src/routes/document.routes.ts`
- `frontend/src/pages/DocumentsPage.tsx`

---

### 6. RC Meeting Module

**Purpose:** Research Council meeting management

**Features:**
- Schedule meetings
- Create and manage agenda items
- Record minutes with versions
- Track project reviews
- Action item follow-up

**Key Files:**
- `backend/src/controllers/rc-meeting.controller.ts`
- `backend/src/routes/rc-meeting.routes.ts`
- `frontend/src/pages/RCMeetingsPage.tsx`

---

### 7. Staff Management Module

**Purpose:** Personnel and team management

**Features:**
- View all staff members
- Assign staff to projects
- Track project roles
- View staff workload

**Key Files:**
- `backend/src/routes/user.routes.ts`
- `frontend/src/pages/StaffPage.tsx`

---

### 8. Reports Module

**Purpose:** Generate analytical reports

**Features:**
- Project status reports
- Financial reports
- Timeline/Gantt exports
- Custom date range filtering

**Key Files:**
- `frontend/src/pages/ReportsPage.tsx`

---

### 9. Timeline Module

**Purpose:** Visual project timeline

**Features:**
- Interactive Gantt chart
- DHTMLX Gantt integration
- Milestone visualization
- Dependency tracking

**Key Files:**
- `frontend/src/pages/TimelinePage.tsx`

---

### 10. Admin Module

**Purpose:** System administration

**Features:**
- User management (CRUD)
- System configuration
- Audit log viewing
- Vertical/Special Area management

**Key Files:**
- `backend/src/routes/admin.routes.ts`
- `frontend/src/pages/UsersPage.tsx`
- `frontend/src/pages/SettingsPage.tsx`

---

## API Structure

### Base URL
```
http://localhost:3001/api
```

### Endpoints Overview

```mermaid
graph LR
    subgraph "Public Routes"
        A["/api/health"]
        B["/api/auth/login"]
        C["/api/auth/register"]
        D["/api/auth/forgot-password"]
    end

    subgraph "Protected Routes"
        E["/api/auth/me"]
        F["/api/auth/refresh"]
        G["/api/auth/2fa/*"]
    end

    subgraph "Project Routes"
        H["GET /api/projects"]
        I["POST /api/projects"]
        J["GET /api/projects/:id"]
        K["PUT /api/projects/:id"]
        L["DELETE /api/projects/:id"]
        M["/api/projects/:id/milestones"]
        N["/api/projects/:id/staff"]
    end

    subgraph "Finance Routes"
        O["GET /api/finance/budgets"]
        P["POST /api/finance/budgets"]
        Q["GET /api/finance/expenses"]
        R["POST /api/finance/expenses"]
        S["GET /api/finance/currency-rate"]
    end

    subgraph "Document Routes"
        T["GET /api/documents"]
        U["POST /api/documents/upload"]
        V["GET /api/documents/:id"]
        W["DELETE /api/documents/:id"]
    end

    subgraph "RC Meeting Routes"
        X["GET /api/rc-meetings"]
        Y["POST /api/rc-meetings"]
        Z["GET /api/rc-meetings/:id"]
        AA["/api/rc-meetings/:id/agenda"]
        AB["/api/rc-meetings/:id/minutes"]
    end

    subgraph "Dashboard Route"
        AC["GET /api/dashboard/stats"]
    end

    subgraph "Admin Routes"
        AD["GET /api/admin/users"]
        AE["POST /api/admin/users"]
        AF["PUT /api/admin/users/:id"]
        AG["DELETE /api/admin/users/:id"]
    end
```

### API Response Format

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional error details */ }
}
```

---

## Frontend Architecture

### Component Structure

```
frontend/src/
├── App.tsx                 # Main app with routing
├── main.tsx               # Entry point
├── index.css              # Global styles & Tailwind
├── assets/                # Static assets
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── layouts/
│   └── DashboardLayout.tsx  # Main authenticated layout
├── pages/
│   ├── LoginPage.tsx        # Authentication
│   ├── DashboardPage.tsx    # Home dashboard
│   ├── ProjectsPage.tsx     # Project listing & creation
│   ├── ProjectDetailPage.tsx # Single project view
│   ├── FinancePage.tsx      # Financial management
│   ├── StaffPage.tsx        # Staff listing
│   ├── RCMeetingsPage.tsx   # RC meetings
│   ├── DocumentsPage.tsx    # Document management
│   ├── ReportsPage.tsx      # Report generation
│   ├── TimelinePage.tsx     # Gantt chart view
│   ├── UsersPage.tsx        # User management (admin)
│   └── SettingsPage.tsx     # System settings (admin)
├── services/              # API service functions
├── stores/
│   └── authStore.ts       # Zustand auth state
├── types/                 # TypeScript interfaces
└── utils/                 # Helper functions
```

### Routing Structure

```mermaid
graph TD
    A["/"] --> B{Authenticated?}
    B -->|No| C["/login"]
    B -->|Yes| D["/dashboard"]
    D --> E["/projects"]
    D --> F["/projects/:id"]
    D --> G["/finance"]
    D --> H["/staff"]
    D --> I["/rc-meetings"]
    D --> J["/documents"]
    D --> K["/reports"]
    D --> L["/timeline"]
    D --> M["/settings"]
    D --> N["/users"]
```

### State Management

```mermaid
graph LR
    subgraph "Zustand Store"
        A[authStore]
    end

    subgraph "State"
        B[user]
        C[token]
        D[isAuthenticated]
    end

    subgraph "Actions"
        E[login]
        F[logout]
        G[setUser]
    end

    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
```

---

## Security Features

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend->>Backend: Generate JWT tokens
    Backend-->>Frontend: Access + Refresh tokens
    Frontend->>Frontend: Store in memory/localStorage
    Frontend-->>User: Redirect to dashboard

    Note over Frontend,Backend: Subsequent requests

    Frontend->>Backend: API request + Access token
    Backend->>Backend: Verify JWT
    Backend-->>Frontend: Protected data

    Note over Frontend,Backend: Token refresh

    Frontend->>Backend: POST /api/auth/refresh
    Backend->>Database: Verify refresh token
    Backend-->>Frontend: New access token
```

### Security Measures

| Layer | Protection |
|-------|-----------|
| **Transport** | HTTPS encryption (production) |
| **Headers** | Helmet.js security headers |
| **Authentication** | JWT with short-lived access tokens (15min) |
| **Password** | Argon2 hashing algorithm |
| **2FA** | TOTP-based two-factor authentication |
| **Rate Limiting** | 100 requests per 15 minutes per IP |
| **CORS** | Restricted to frontend origin |
| **Validation** | Zod schema validation on all inputs |
| **RBAC** | Role-based access control |
| **Audit** | Comprehensive activity logging |
| **File Integrity** | SHA-256 hash verification |

---

## Real-time Features

### Socket.IO Implementation

```mermaid
graph TD
    subgraph "Server Events"
        A[project:updated]
        B[dashboard:updated]
        C[notification]
    end

    subgraph "Client Subscriptions"
        D["subscribe:project"]
        E["subscribe:dashboard"]
    end

    subgraph "Rooms"
        F["project:{projectId}"]
        G["dashboard:{userId}"]
    end

    D --> F
    E --> G
    A --> F
    B --> G
    C --> G
```

### Real-time Use Cases

1. **Project Updates**: When a project is modified, all subscribed users receive instant updates
2. **Dashboard Refresh**: Real-time statistics updates
3. **Notifications**: Instant delivery of alerts and notifications
4. **Collaborative Editing**: Live updates when multiple users work on same project

---

## Deployment Architecture

### Production Deployment Diagram

```mermaid
graph TB
    subgraph "Internet"
        A[Users]
    end

    subgraph "CDN / Load Balancer"
        B[Nginx / Cloudflare]
    end

    subgraph "Application Tier"
        C[Node.js Server 1]
        D[Node.js Server 2]
        E[Node.js Server N]
    end

    subgraph "Cache Layer"
        F[Redis]
    end

    subgraph "Database Tier"
        G[(PostgreSQL Primary)]
        H[(PostgreSQL Replica)]
    end

    subgraph "Storage"
        I[File Storage / S3]
    end

    subgraph "External Services"
        J[SMTP Server]
        K[Currency API]
    end

    A --> B
    B --> C
    B --> D
    B --> E
    C --> F
    D --> F
    E --> F
    C --> G
    D --> G
    E --> G
    G --> H
    C --> I
    D --> I
    E --> I
    C --> J
    C --> K
```

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://portal.serc.res.in

# Database
DATABASE_URL=postgresql://user:pass@host:5432/serc_portal

# JWT
JWT_ACCESS_SECRET=<secure-random-string>
JWT_REFRESH_SECRET=<secure-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ictserc@gmail.com
SMTP_PASS=<app-password>
SMTP_FROM=CSIR-SERC Portal <noreply@serc.res.in>

# Currency API
CURRENCY_API_KEY=<api-key>
CURRENCY_API_URL=https://api.freecurrencyapi.com/v1/latest

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

# 2FA
TWO_FA_ISSUER=CSIR-SERC Portal
```

---

## Quick Start Guide

### Prerequisites
- Node.js ≥ 22.0.0
- PostgreSQL database
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Default Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@serc.res.in | Admin@SERC2024 |
| Director | director@serc.res.in | Director@SERC2024 |
| Supervisor | supervisor@serc.res.in | Supervisor@SERC2024 |
| PI | pi@serc.res.in | PI@SERC2024 |

---

## Conclusion

The CSIR-SERC Project Management Portal provides a comprehensive solution for managing research projects with features tailored to the specific needs of a research institution. The modular architecture allows for easy extension and customization, while the security features ensure data protection and regulatory compliance.

For technical support or feature requests, please contact the ICT team at ictserc@gmail.com.

---

*Document generated on December 31, 2024*
