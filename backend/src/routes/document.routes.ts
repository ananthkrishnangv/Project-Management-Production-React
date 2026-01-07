import { Router } from 'express';
import * as documentController from '../controllers/document.controller.js';
import { authenticate, authorize, uploadSingle } from '../middleware/index.js';

const router = Router();

router.use(authenticate);

// Documents
router.get('/', documentController.getDocuments);
router.post('/', uploadSingle, documentController.uploadDocument);
router.get('/:id/download', documentController.downloadDocument);
router.delete('/:id', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), documentController.deleteDocument);

// MoUs
router.get('/mous', documentController.getMoUs);
router.post('/mous', uploadSingle, documentController.createMoU);

// Project outputs
router.get('/outputs', documentController.getProjectOutputs);
router.post('/outputs', uploadSingle, documentController.addProjectOutput);

// QR Code for assets
router.post('/qr/asset', documentController.generateAssetQR);

// External feedback
router.post('/feedback', uploadSingle, documentController.submitExternalFeedback);
router.get('/feedback/:projectId', documentController.getExternalFeedback);

export default router;
