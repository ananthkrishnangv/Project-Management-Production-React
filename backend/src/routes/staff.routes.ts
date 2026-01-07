// Staff Routes
import { Router } from 'express';
import { staffController } from '../controllers/staff.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Bulk assign staff to project (Admin, BKMD Head, Director)
router.post('/assign-bulk', staffController.bulkAssign);

// Get all staff with project counts
router.get('/', staffController.getStaffWithProjects);

// Get current user's page permissions
router.get('/permissions', staffController.getPagePermissions);

// Get user's project assignments
router.get('/:userId/assignments', staffController.getUserAssignments);

// Assign single user to project
router.post('/:userId/assign', staffController.assignToProject);

// Remove staff from project
router.delete('/projects/:projectId/users/:userId', staffController.removeFromProject);

// Push notification to all project heads (BKMD Head only)
router.post('/push-update-request', staffController.pushRequestUpdate);

// ============ ADMIN ONLY - Role Management ============
// Get all users for role management (ADMIN only)
router.get('/roles/users', staffController.getUsersForRoleManagement);

// Update user role (ADMIN only)
router.put('/:userId/role', staffController.updateUserRole);

export default router;
