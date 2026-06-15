import express from 'express';
import { 
  logCallSupport, 
  triggerEmergencyHotline, 
  updateEmergencyStatus, 
  getCallLogs, 
  getEmergencies,
  getNurses
} from '../controllers/supportChannelController.js';

const router = express.Router();

router.post('/call/log', logCallSupport);
router.post('/emergency/trigger', triggerEmergencyHotline);
router.post('/emergency/status/:id', updateEmergencyStatus);
router.get('/call/list', getCallLogs);
router.get('/emergency/list', getEmergencies);
router.get('/nurses', getNurses);

export default router;
