import express from 'express';
import { 
  createTicket, 
  getTickets, 
  getTicketById, 
  addReply, 
  updateTicketStatus, 
  updateAgentNotes, 
  getAnalyticsStats 
} from '../controllers/ticketController.js';

const router = express.Router();

// General & Patient operations
router.post('/create', createTicket);
router.get('/list', getTickets);

// Admin & Agent operations (must be BEFORE /:id to avoid route conflict)
router.get('/stats/analytics', getAnalyticsStats);
router.post('/status/:id', updateTicketStatus);
router.post('/notes/:id', updateAgentNotes);

// Parameterized routes last
router.get('/:id', getTicketById);
router.post('/reply/:id', addReply);

export default router;
