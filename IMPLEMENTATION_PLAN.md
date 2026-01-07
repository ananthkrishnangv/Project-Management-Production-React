# CSIR-SERC Project Management Portal - Implementation Plan

**Version:** 1.0.0  
**Created:** December 31, 2024  
**Status:** Implementation Complete (Phase 1)  
**Organization:** CSIR-Structural Engineering Research Centre, Chennai

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Component Implementation Details](#component-implementation-details)
5. [Database Implementation](#database-implementation)
6. [API Implementation](#api-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Security Implementation](#security-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)
11. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Vision
Create a unified, modern web portal to manage all research projects at CSIR-SERC, replacing fragmented spreadsheet-based tracking with a centralized, real-time system.

### Objectives
1. **Centralized Project Management** - Single source of truth for all projects
2. **Financial Transparency** - Real-time budget tracking with multi-currency support
3. **Compliance** - Research Council meeting management and audit trails
4. **Efficiency** - Automated notifications, deadline tracking, and reporting
5. **Security** - Role-based access control with 2FA support

### Scope

```mermaid
mindmap
  root((CSIR-SERC Portal))
    Authentication
      Login/Logout
      JWT Tokens
      Two-Factor Auth
      Password Reset
    Project Management
      GAP Projects
      CNP Projects
      OLP Projects
      Milestones
      Staff Assignment
    Financial Management
      Budget Allocation
      Expense Tracking
      Multi-Currency
      Exchange Rates
      Cash Flow
    Document Management
      File Upload
      Versioning
      Access Control
      Integrity Check
    RC Meetings
      Scheduling
      Agenda Management
      Minutes Recording
      Project Reviews
    Reporting
      Dashboards
      Charts
      Timeline/Gantt
      PDF Export
    Administration
      User Management
      System Config
      Audit Logs
      Vertical Management
```

---

## Technical Architecture

### System Architecture Layers

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[React SPA]
        B[Fluent UI Components]
        C[Tailwind CSS Styles]
        D[Chart.js Visualizations]
    end

    subgraph "Application Layer"
        E[Express.js Server]
        F[REST API Routes]
        G[Business Logic Controllers]
        H[Validation Middleware]
    end

    subgraph "Service Layer"
        I[Authentication Service]
        J[Email Service]
        K[File Storage Service]
        L[Currency Service]
    end

    subgraph "Data Access Layer"
        M[Prisma ORM]
        N[Database Models]
        O[Query Optimization]
    end

    subgraph "Infrastructure Layer"
        P[(PostgreSQL)]
        Q[File System]
        R[Socket.IO Server]
    end

    A --> E
    B --> A
    C --> A
    D --> A
    E --> F
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L
    I --> M
    J --> M
    K --> Q
    L --> M
    M --> N
    N --> O
    O --> P
    E --> R
```

### Directory Structure

```
csir-serc-portal/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (500 lines)
│   │   └── seed.ts             # Database seeding script
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.ts        # Environment configuration
│   │   │   ├── database.ts     # Prisma client instance
│   │   │   └── permissions.ts  # RBAC permissions matrix
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── finance.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   └── rc-meeting.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   ├── upload.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── index.ts        # Route aggregator
│   │   │   ├── auth.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── document.routes.ts
│   │   │   ├── finance.routes.ts
│   │   │   ├── project.routes.ts
│   │   │   ├── rc-meeting.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── services/
│   │   │   ├── email.service.ts
│   │   │   └── currency.service.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   └── index.ts            # Server entry point
│   ├── uploads/                # File upload directory
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── public/
│   │   └── images/
│   │       └── CSIR-LOGO-PNG-200px.jpg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   ├── FinancePage.tsx
│   │   │   ├── StaffPage.tsx
│   │   │   ├── RCMeetingsPage.tsx
│   │   │   ├── DocumentsPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── TimelinePage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   ├── stores/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── shared/                     # Shared types (future)
├── PROJECT_WALKTHROUGH.md
└── IMPLEMENTATION_PLAN.md
```

---

## Implementation Phases

### Phase Overview

```mermaid
gantt
    title Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Project Setup & Architecture    :done, p1a, 2024-12-28, 1d
    Database Design                 :done, p1b, 2024-12-28, 1d
    Backend Infrastructure          :done, p1c, 2024-12-29, 2d
    Frontend Scaffolding            :done, p1d, 2024-12-30, 2d
    
    section Phase 2
    Authentication Module           :active, p2a, 2025-01-01, 3d
    User Management                 :p2b, 2025-01-04, 2d
    Dashboard Implementation        :p2c, 2025-01-06, 2d
    
    section Phase 3
    Project Management              :p3a, 2025-01-08, 5d
    Milestone Tracking              :p3b, 2025-01-13, 2d
    Staff Assignment                :p3c, 2025-01-15, 2d
    
    section Phase 4
    Finance Module                  :p4a, 2025-01-17, 5d
    Currency Integration            :p4b, 2025-01-22, 2d
    Expense Reporting               :p4c, 2025-01-24, 2d
    
    section Phase 5
    Document Management             :p5a, 2025-01-26, 3d
    RC Meeting Module               :p5b, 2025-01-29, 4d
    
    section Phase 6
    Reporting & Analytics           :p6a, 2025-02-02, 3d
    Timeline/Gantt Views            :p6b, 2025-02-05, 2d
    Notifications System            :p6c, 2025-02-07, 3d
    
    section Phase 7
    Testing & Bug Fixes             :p7a, 2025-02-10, 5d
    Performance Optimization        :p7b, 2025-02-15, 3d
    Deployment                      :p7c, 2025-02-18, 2d
```

---

### Phase 1: Foundation (Completed ✅)

#### 1.1 Project Setup

**Backend Setup:**
- [x] Initialize Node.js project with TypeScript
- [x] Configure Express.js with middleware stack
- [x] Setup Prisma ORM with PostgreSQL
- [x] Configure environment variables
- [x] Implement security middleware (Helmet, CORS, Rate Limiting)

**Frontend Setup:**
- [x] Create Vite + React + TypeScript project
- [x] Configure Tailwind CSS with custom design system
- [x] Install and configure Fluent UI components
- [x] Setup React Router v7
- [x] Configure Zustand for state management

#### 1.2 Database Design

**Schema Implementation:**
- [x] User & Authentication models
- [x] Project & Milestone models
- [x] Financial models (Budget, Expense, CashFlow)
- [x] Document models
- [x] RC Meeting models
- [x] Notification & Audit models
- [x] System configuration models

---

### Phase 2: Authentication & Core (In Progress)

#### 2.1 Authentication Module

```mermaid
flowchart TD
    A[Login Page] --> B{Valid Credentials?}
    B -->|No| C[Show Error]
    B -->|Yes| D{2FA Enabled?}
    D -->|No| E[Generate Tokens]
    D -->|Yes| F[Request 2FA Code]
    F --> G{Valid Code?}
    G -->|No| H[Show 2FA Error]
    G -->|Yes| E
    E --> I[Store Tokens]
    I --> J[Redirect to Dashboard]
```

**Implementation Tasks:**
- [x] JWT access/refresh token generation
- [x] Login/logout endpoints
- [x] Token refresh mechanism
- [ ] 2FA setup and verification
- [ ] Password reset via email
- [ ] Email verification

#### 2.2 Dashboard Implementation

**Metrics to Display:**
- Total projects by status
- Projects by category (GAP, CNP, OLP)
- Budget overview (allocated vs. utilized)
- Recent activities
- Upcoming deadlines
- MoU expiry alerts

---

### Phase 3: Project Management

#### 3.1 Project CRUD Operations

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_APPROVAL : Submit for Review
    PENDING_APPROVAL --> ACTIVE : Approve
    PENDING_APPROVAL --> DRAFT : Request Changes
    ACTIVE --> ON_HOLD : Pause
    ON_HOLD --> ACTIVE : Resume
    ACTIVE --> COMPLETED : Mark Complete
    PENDING_APPROVAL --> CANCELLED : Reject
    ON_HOLD --> CANCELLED : Cancel
```

**Features:**
- Project creation with all fields
- Auto-generated project codes (e.g., GAP-2025-WE-001)
- Status workflow management
- Vertical and Special Area assignment
- Project head assignment

#### 3.2 Milestone Management

- Create milestones with dates
- Track progress (0-100%)
- Status management (Pending, In Progress, Completed, Overdue)
- Ordering and dependencies

#### 3.3 Staff Assignment

- Add/remove team members
- Assign project roles (Co-PI, Scientist, Technical Officer)
- Track active/inactive status
- View member history

---

### Phase 4: Financial Management

#### 4.1 Budget Module

```mermaid
pie title Budget Categories
    "Equipment" : 40
    "Manpower" : 25
    "Travel" : 15
    "Consumables" : 10
    "Contingency" : 10
```

**Features:**
- Fiscal year-based budgets
- Category-wise allocation
- Multi-currency support (INR/USD)
- Exchange rate tracking
- Utilization tracking

#### 4.2 Expense Management

- Record expenses with receipts
- Invoice management
- Vendor tracking
- Approval workflow
- Currency conversion

#### 4.3 Cash Flow Tracking

- Record funds received
- Track fund sources
- Monitor utilization
- Generate UC (Utilization Certificate)

---

### Phase 5: Documents & Meetings

#### 5.1 Document Management

**Document Types:**
- Reports
- Photos
- Videos
- MoUs
- Certificates
- Utilization Certificates
- Other

**Features:**
- Multer-based file upload (50MB max)
- SHA-256 hash for integrity
- Version control
- Access control per document
- Metadata extraction

#### 5.2 RC Meeting Module

```mermaid
flowchart LR
    A[Schedule Meeting] --> B[Create Agenda]
    B --> C[Add Projects for Review]
    C --> D[Conduct Meeting]
    D --> E[Record Minutes]
    E --> F[Track Action Items]
    F --> G[Finalize Minutes]
```

---

### Phase 6: Reporting & Analytics

#### 6.1 Dashboard Charts

- Project status distribution (Doughnut chart)
- Monthly expense trend (Line chart)
- Budget vs. Actual (Bar chart)
- Category-wise projects (Pie chart)

#### 6.2 Timeline Views

- DHTMLX Gantt integration
- Project timeline visualization
- Milestone dependencies
- Resource allocation view

#### 6.3 Notification System

**Notification Types:**
- Deadline alerts (7, 3, 1 day before)
- Budget warnings (80% utilized)
- MoU expiry (30 days before)
- RC meeting reminders
- Approval required alerts
- System notifications

---

### Phase 7: Testing & Deployment

#### 7.1 Testing Strategy

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Vitest (Frontend), Jest (Backend) | 80% |
| Integration Tests | Supertest | Key workflows |
| E2E Tests | Playwright | Critical paths |
| Performance | k6 | Response time < 200ms |

#### 7.2 Deployment

**Production Environment:**
- Node.js 22+ runtime
- PostgreSQL 15+
- Nginx reverse proxy
- PM2 process manager
- SSL/TLS certificates

---

## Component Implementation Details

### Backend Controllers

#### Auth Controller
[auth.controller.ts](file:///home/ananth/Documents/Project%20Management/csir-serc-portal/backend/src/controllers/auth.controller.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/2fa/setup` | POST | Enable 2FA |
| `/api/auth/2fa/verify` | POST | Verify 2FA code |
| `/api/auth/forgot-password` | POST | Initiate password reset |
| `/api/auth/reset-password` | POST | Complete password reset |

---

#### Project Controller
[project.controller.ts](file:///home/ananth/Documents/Project%20Management/csir-serc-portal/backend/src/controllers/project.controller.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/:id` | GET | Get project details |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/projects/:id/milestones` | GET | List milestones |
| `/api/projects/:id/milestones` | POST | Add milestone |
| `/api/projects/:id/staff` | GET | List staff |
| `/api/projects/:id/staff` | POST | Add staff member |

---

#### Finance Controller
[finance.controller.ts](file:///home/ananth/Documents/Project%20Management/csir-serc-portal/backend/src/controllers/finance.controller.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/budgets` | GET | List budgets |
| `/api/finance/budgets` | POST | Create budget |
| `/api/finance/expenses` | GET | List expenses |
| `/api/finance/expenses` | POST | Record expense |
| `/api/finance/cash-flows` | GET | List cash flows |
| `/api/finance/cash-flows` | POST | Record cash flow |
| `/api/finance/currency-rate` | GET | Get current rate |

---

#### Document Controller
[document.controller.ts](file:///home/ananth/Documents/Project%20Management/csir-serc-portal/backend/src/controllers/document.controller.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | List documents |
| `/api/documents/upload` | POST | Upload file |
| `/api/documents/:id` | GET | Get document |
| `/api/documents/:id` | DELETE | Delete document |
| `/api/documents/:id/download` | GET | Download file |

---

#### RC Meeting Controller
[rc-meeting.controller.ts](file:///home/ananth/Documents/Project%20Management/csir-serc-portal/backend/src/controllers/rc-meeting.controller.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rc-meetings` | GET | List meetings |
| `/api/rc-meetings` | POST | Schedule meeting |
| `/api/rc-meetings/:id` | GET | Get meeting |
| `/api/rc-meetings/:id` | PUT | Update meeting |
| `/api/rc-meetings/:id/agenda` | GET | Get agenda |
| `/api/rc-meetings/:id/agenda` | POST | Add agenda item |
| `/api/rc-meetings/:id/minutes` | GET | Get minutes |
| `/api/rc-meetings/:id/minutes` | POST | Record minutes |

---

#### Dashboard Controller
[dashboard.controller.ts](file:///home/ananth/Documents/Project%20Management/csir-serc-portal/backend/src/controllers/dashboard.controller.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Get all statistics |
| `/api/dashboard/recent-activities` | GET | Get recent activities |
| `/api/dashboard/upcoming-deadlines` | GET | Get deadlines |
| `/api/dashboard/notifications` | GET | Get notifications |

---

## Database Implementation

### Key Relationships

```mermaid
graph LR
    A[User] -->|heads| B[Project]
    A -->|member of| C[ProjectStaff]
    C -->|belongs to| B
    B -->|has| D[Milestone]
    B -->|has| E[Budget]
    B -->|has| F[Expense]
    B -->|has| G[Document]
    B -->|has| H[MoU]
    B -->|produces| I[ProjectOutput]
    B -->|discussed in| J[RCAgendaItem]
    J -->|belongs to| K[RCMeeting]
    K -->|has| L[RCMinutes]
    A -->|creates| L
    A -->|uploads| G
    A -->|receives| M[Notification]
    A -->|creates| N[AuditLog]
    B -->|belongs to| O[Vertical]
    B -->|belongs to| P[SpecialArea]
```

### Indexes for Optimization

| Table | Indexed Columns | Purpose |
|-------|----------------|---------|
| User | email, role | Fast login, role filtering |
| Project | code, category, status, verticalId, projectHeadId | Search, filter |
| Milestone | projectId, status | Project timeline |
| Budget | projectId, fiscalYear | Financial queries |
| Expense | projectId, category | Expense reports |
| Document | projectId, type, uploadedById | Document search |
| MoU | projectId, expiryDate | Expiry alerts |
| Notification | userId, isRead, type | Notification queries |
| AuditLog | userId, entity, action, createdAt | Audit queries |

---

## Frontend Implementation

### Page Components

| Page | Path | Features |
|------|------|----------|
| LoginPage | `/login` | Login form, 2FA, animations |
| DashboardPage | `/dashboard` | Stats, charts, activities |
| ProjectsPage | `/projects` | List, create, filter, search |
| ProjectDetailPage | `/projects/:id` | Full project view, tabs |
| FinancePage | `/finance` | Budgets, expenses, charts |
| StaffPage | `/staff` | Staff listing, assignments |
| RCMeetingsPage | `/rc-meetings` | Meeting management |
| DocumentsPage | `/documents` | File upload, listing |
| ReportsPage | `/reports` | Report generation |
| TimelinePage | `/timeline` | Gantt chart view |
| UsersPage | `/users` | User management (admin) |
| SettingsPage | `/settings` | System settings (admin) |

### Design System

**Color Palette:**
```css
/* Primary - Deep Royal Blue */
--color-primary-600: #1e3a5f;
--color-primary-700: #0f2744;

/* Secondary - Slate */
--color-secondary-500: #64748b;
--color-secondary-700: #334155;

/* Accent - Gold */
--color-accent-500: #c9a227;
--color-accent-600: #b8941f;

/* Status Colors */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--color-info: #3b82f6;
```

**Typography:**
- Display: Playfair Display (serif)
- Body: Inter (sans-serif)
- Code: JetBrains Mono (monospace)

---

## Security Implementation

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database

    C->>S: POST /auth/login {email, password}
    S->>DB: Find user by email
    DB-->>S: User record
    S->>S: Verify password (Argon2)
    alt 2FA Enabled
        S-->>C: {requires2FA: true}
        C->>S: POST /auth/2fa/verify {code}
        S->>S: Verify TOTP
    end
    S->>S: Generate JWT (15min access, 7d refresh)
    S->>DB: Store refresh token
    S-->>C: {accessToken, refreshToken, user}
    
    Note over C,S: Subsequent Requests
    C->>S: GET /api/projects (Bearer token)
    S->>S: Verify JWT signature
    S->>S: Check token expiry
    S->>S: Check role permissions
    S-->>C: Protected data
    
    Note over C,S: Token Refresh
    C->>S: POST /auth/refresh {refreshToken}
    S->>DB: Verify refresh token
    S->>S: Generate new access token
    S-->>C: {accessToken}
```

### RBAC Implementation

```typescript
// Permission check flow
export const checkPermission = (
    userRole: UserRole,
    resource: Resource,
    action: Action
): boolean => {
    const permissions = rolePermissions[userRole];
    return permissions?.[resource]?.[action] ?? false;
};

// Usage in middleware
export const requirePermission = (resource: Resource, action: Action) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!checkPermission(user.role, resource, action)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
```

---

## Testing Strategy

### Test Categories

```mermaid
graph TD
    A[Testing Pyramid] --> B[Unit Tests]
    A --> C[Integration Tests]
    A --> D[E2E Tests]
    
    B --> B1[Controller logic]
    B --> B2[Utility functions]
    B --> B3[Middleware]
    B --> B4[React components]
    
    C --> C1[API endpoints]
    C --> C2[Database operations]
    C --> C3[Authentication flow]
    
    D --> D1[User journeys]
    D --> D2[Critical workflows]
    D --> D3[Cross-browser]
```

### Test Commands

```bash
# Backend tests
cd backend
npm run test           # Run all tests
npm run test:coverage  # With coverage
npm run test:watch     # Watch mode

# Frontend tests
cd frontend
npm run test           # Run all tests
npm run test:e2e       # E2E tests
```

---

## Deployment Plan

### Infrastructure Requirements

```mermaid
graph TB
    subgraph "Production Stack"
        A[Nginx] --> B[Node.js Cluster]
        B --> C[(PostgreSQL)]
        B --> D[Redis Cache]
        B --> E[File Storage]
    end
    
    subgraph "Monitoring"
        F[PM2]
        G[Log Aggregation]
        H[Error Tracking]
    end
    
    B --> F
    B --> G
    B --> H
```

### Deployment Steps

1. **Database Setup**
   ```bash
   # Create database
   createdb csir_serc_portal
   
   # Run migrations
   npx prisma migrate deploy
   
   # Seed initial data
   npm run db:seed
   ```

2. **Backend Deployment**
   ```bash
   # Build
   npm run build
   
   # Start with PM2
   pm2 start dist/index.js --name csir-portal -i max
   ```

3. **Frontend Deployment**
   ```bash
   # Build
   npm run build
   
   # Copy to web server
   cp -r dist/* /var/www/portal/
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name portal.serc.res.in;
       
       location / {
           root /var/www/portal;
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
       }
   }
   ```

---

## Future Enhancements

### Phase 8: Advanced Features (Q2 2025)

| Feature | Description | Priority |
|---------|-------------|----------|
| **PDF Export** | Generate project reports as PDF | High |
| **Email Digests** | Weekly summary emails | High |
| **Mobile App** | React Native companion app | Medium |
| **AI Assistant** | ChatGPT integration for queries | Medium |
| **Calendar Sync** | Google/Outlook integration | Low |
| **Advanced Analytics** | Predictive insights | Low |

### Phase 9: Enterprise Features (Q3 2025)

- SSO integration (LDAP/Active Directory)
- API rate limiting per user
- Audit report generation
- Data backup automation
- Multi-tenant support

---

## Support & Maintenance

### Contact Information

| Role | Name | Email |
|------|------|-------|
| ICT Team | SERC ICT | ictserc@gmail.com |
| System Admin | Admin | admin@serc.res.in |

### Maintenance Schedule

- **Daily**: Automated backups
- **Weekly**: Security updates check
- **Monthly**: Performance review
- **Quarterly**: Feature assessment

---

## Appendices

### A. Environment Variables Reference

```bash
# Complete .env file
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/csir_serc_portal

JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ictserc@gmail.com
SMTP_PASS=app-specific-password
SMTP_FROM=CSIR-SERC Portal <noreply@serc.res.in>

CURRENCY_API_KEY=your-currency-api-key
CURRENCY_API_URL=https://api.freecurrencyapi.com/v1/latest

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

TWO_FA_ISSUER=CSIR-SERC Portal
```

### B. API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Server Error |

### C. Project Code Format

```
{CATEGORY}-{YEAR}-{VERTICAL_CODE}-{SEQUENCE}

Examples:
- GAP-2025-WE-001  (Grant-in-Aid, Wind Engineering, 1st project of 2025)
- CNP-2025-TT-012  (Consultancy, Tower Testing, 12th project of 2025)
- OLP-2025-SHM-003 (Other Lab, Structural Health Monitoring, 3rd project)
```

---

*Document prepared by the ICT Team, CSIR-SERC*  
*Last updated: December 31, 2024*
