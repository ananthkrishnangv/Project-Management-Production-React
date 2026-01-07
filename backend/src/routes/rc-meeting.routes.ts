import { Router } from 'express';
import * as rcMeetingController from '../controllers/rc-meeting.controller.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

router.use(authenticate);

// Meetings
router.get('/', rcMeetingController.getMeetings);
router.get('/members', rcMeetingController.getRCMembers);
router.get('/:id', rcMeetingController.getMeeting);
router.post('/', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.createMeeting);
router.put('/:id', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.updateMeeting);

// Agenda items
router.post('/:id/agenda', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.addAgendaItem);
router.put('/:id/agenda/:itemId', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.updateAgendaItem);
router.delete('/:id/agenda/:itemId', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.deleteAgendaItem);

// Minutes
router.post('/:id/minutes', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.recordMinutes);

// Meeting pack
router.get('/:id/pack', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), rcMeetingController.generateMeetingPack);

export default router;
