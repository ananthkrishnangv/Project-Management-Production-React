// Budget Routes
import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Budget requests
router.get('/requests/pending', budgetController.getPendingRequests);
router.post('/requests/:projectId', budgetController.requestBudget);
router.post('/requests/:requestId/approve', budgetController.approveBudgetRequest);

// Budget allocation and transfer
router.post('/allocate', budgetController.allocateBudget);
router.post('/transfer', budgetController.transferBudget);
router.get('/transfers', budgetController.getTransfers);

// Yearly summary and archival
router.get('/summary/:year?', budgetController.getYearlySummary);
router.post('/archive', budgetController.archiveYearEnd);

export default router;
