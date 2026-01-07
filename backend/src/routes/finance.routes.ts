import { Router } from 'express';
import * as financeController from '../controllers/finance.controller.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

router.use(authenticate);

// Dashboard (director only)
router.get('/dashboard', authorize('ADMIN', 'DIRECTOR'), financeController.getFinanceDashboard);

// Currency
router.get('/currency-rate', financeController.getExchangeRate);
router.post('/convert', financeController.convertCurrency);

// Cash flow
router.get('/cashflow', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), financeController.getCashFlow);
router.post('/projects/:projectId/cashflow', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), financeController.addCashFlow);

// Project budget
router.get('/projects/:projectId/budget', financeController.getProjectBudget);
router.post('/projects/:projectId/budget', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), financeController.upsertBudget);
router.post('/projects/:projectId/expenses', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), financeController.addExpense);

// Reports
router.get('/costing-summary', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), financeController.getCostingSummary);

export default router;
