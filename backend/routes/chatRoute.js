import express from 'express';
import { 
  getOrCreateSession, 
  postMessage, 
  getMessages, 
  getAllSessions, 
  assignSession, 
  toggleAISession, 
  markSessionRead, 
  archiveSession, 
  exportChatHistory,
  uploadAttachment 
} from '../controllers/chatController.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// User & Doctor endpoints
router.post('/session', getOrCreateSession);
router.post('/message', postMessage);
router.get('/messages', getMessages);

// Admin / Support Agent endpoints
router.get('/sessions', getAllSessions);
router.post('/session/assign/:sessionId', assignSession);
router.post('/session/ai/:sessionId', toggleAISession);
router.post('/session/read/:sessionId', markSessionRead);
router.post('/session/archive/:sessionId', archiveSession);
router.get('/session/export/:sessionId', exportChatHistory);

// Shared File Upload endpoint
router.post('/upload', upload.single('file'), uploadAttachment);

export default router;
