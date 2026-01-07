import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

router.use(authenticate);

// Role-specific dashboards
router.get('/director', authorize('ADMIN', 'DIRECTOR'), dashboardController.getDirectorDashboard);
router.get('/supervisor', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), dashboardController.getSupervisorDashboard);
router.get('/project-head', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), dashboardController.getProjectHeadDashboard);

// Live statistics (for WebSocket/polling)
router.get('/live', dashboardController.getLiveStats);

export default router;
