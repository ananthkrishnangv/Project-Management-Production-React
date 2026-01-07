import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project CRUD
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), projectController.createProject);
router.put('/:id', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), projectController.updateProject);
router.delete('/:id', authorize('ADMIN'), projectController.deleteProject);

// Project statistics (for RC meetings)
router.get('/:id/stats', projectController.getProjectStats);

// Staff management
router.post('/:id/staff', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), projectController.addProjectStaff);
router.post('/:id/staff/bulk', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), projectController.bulkAddProjectStaff);
router.delete('/:id/staff/:userId', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), projectController.removeProjectStaff);

// Milestones
router.post('/:id/milestones', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), projectController.addMilestone);
router.put('/:id/milestones/:milestoneId', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), projectController.updateMilestone);

export default router;
