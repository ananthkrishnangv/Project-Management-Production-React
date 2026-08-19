# CSIR-SERC Portal - Issue Tracking Log

> This document tracks known issues, debugging notes, and resolution steps for future reference.

---

## Open Issues

### ISSUE-001: API Authentication 401 Errors
**Status:** 🔴 Open  
**Severity:** High  
**Reported:** 2026-01-14  
**Affected:** All protected API endpoints

**Symptoms:**
- All protected API endpoints return `401 Unauthorized`
- Projects page shows "No projects found" despite dashboard showing project counts
- Users page crashes (white screen with `TypeError: s.map is not a function`)
- Document uploads fail with internal error

**Investigation:**
- `/api/verticals` returns data (200 OK) - confirms API is running
- Admin users exist in database (`admin@serc.res.in`, `ambily.serc@csir.res.in`)
- JWT secrets configured correctly in `.env`
- Auth middleware checks token validity and user existence
- Browser stores tokens in localStorage/session

**Possible Causes:**
1. Browser storing expired/invalid JWT tokens
2. JWT secret mismatch between token generation and validation
3. Token refresh mechanism not working
4. CORS preventing authentication headers

**Attempted Fixes:**
- [x] Added `validate: false` to rate limiter
- [x] Set `TRUST_PROXY=true` in server .env
- [x] Redeployed backend with latest code
- [x] Regenerated Prisma client
- [x] Restarted PM2 process

**Resolution Steps To Try:**
1. Clear browser localStorage and log in fresh
2. Check browser DevTools Network tab for actual error response
3. Verify JWT_ACCESS_SECRET matches between .env and token
4. Check token expiry times (JWT_ACCESS_EXPIRY=15m default)
5. Test login with curl: 
   ```bash
   curl -X POST http://10.10.200.36/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@serc.res.in","password":"YOUR_PASSWORD"}'
   ```

---

### ISSUE-002: Express Rate Limiter X-Forwarded-For Error
**Status:** 🟢 Resolved  
**Severity:** Medium  
**Reported:** 2026-01-14  
**Resolved:** 2026-01-14

**Error:**
```
ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
The 'X-Forwarded-For' header is set but Express 'trust proxy' setting is false
```

**Resolution:**
- Added `validate: false` to `rateLimit()` config in `backend/src/index.ts`
- Set `TRUST_PROXY=true` in server environment

---

### ISSUE-003: TypeScript Build Errors
**Status:** 🟡 Known Issue (Non-blocking)  
**Severity:** Low  
**Reported:** 2026-01-14

**Affected Files:**
- `src/routes/user.routes.ts` - Type string[] not assignable to string
- `src/routes/timeline.routes.ts` - Same query param type issues
- `src/routes/settings.routes.ts` - Same query param type issues
- `src/scripts/import-*.ts` - Missing xlsx and bcryptjs type declarations

**Notes:**
- Build completes despite errors (exit code 0)
- These are type checking issues, not runtime errors
- Query parameters need explicit type casting: `req.query.param as string`

---

## Resolved Issues Archive

### ISSUE-R001: Project Edit Button Not Visible
**Status:** ✅ Resolved  
**Resolved:** 2026-01-14

**Solution:**
- Added `canEdit` check for roles: ADMIN, DIRECTOR, SUPERVISOR, PROJECT_HEAD
- Added Edit button conditionally in ProjectDetailPage.tsx header
- Created edit modal with form fields

---

### ISSUE-R002: Budget Request Project Dropdown Empty
**Status:** ✅ Resolved  
**Resolved:** 2026-01-14

**Solution:**
- Added `Array.isArray()` check in FinancePage.tsx
- Handles multiple API response formats

---

## Debugging Commands

### Check PM2 Status
```bash
ssh root@10.10.200.36 "pm2 list"
ssh root@10.10.200.36 "pm2 logs csir-serc-portal --lines 50 --nostream"
```

### Test API Endpoints
```bash
# Public endpoint
curl -s http://10.10.200.36/api/verticals | jq

# Login
curl -X POST http://10.10.200.36/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@serc.res.in","password":"password"}'

# Authenticated endpoint
curl -s http://10.10.200.36/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Restart Backend
```bash
ssh root@10.10.200.36 "cd /opt/csir-serc-portal/backend && npx prisma generate && pm2 restart csir-serc-portal"
```

### Check Database
```bash
ssh root@10.10.200.36 "cd /opt/csir-serc-portal/backend && node -e \"
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({where:{role:'ADMIN'},select:{email:true,firstName:true,isActive:true}}).then(console.log);
\""
```

---

## Server Information

| Item | Value |
|------|-------|
| Server IP | 10.10.200.36 |
| Application Path | /opt/csir-serc-portal/ |
| Frontend Path | /opt/csir-serc-portal/frontend/dist/ |
| Backend Path | /opt/csir-serc-portal/backend/ |
| PM2 Process Name | csir-serc-portal |
| Node Version | v20.x (server) |
| Database | PostgreSQL (localhost:5432) |
| Database Name | csir_serc_portal |

---

## Contact

For issues or questions:
- **Email:** ictserc@gmail.com
- **GitHub:** https://github.com/ananthkrishnangv/CSIR-SERC-Project-Management-System
