// Report Routes
import { Router } from 'express';
import { reportController, upload } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export reports (PDF or Excel)
router.get('/export', reportController.exportReport);

// Get pending reports for approval (BKMD Head, Director)
router.get('/pending', reportController.getPendingReports);

// Get single report
router.get('/:reportId', reportController.getReport);

// Approve/Reject report
router.post('/:reportId/approve', reportController.approveReport);

// Upload attachment to report
router.post('/:reportId/attachments', upload.single('file'), reportController.uploadAttachment);

// Project-specific report routes
router.get('/projects/:projectId', reportController.getProjectReports);
router.post('/projects/:projectId', reportController.createReport);

export default router;
