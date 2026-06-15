import express from 'express';
import { registerNurse, loginNurse, getAdmissions, addDailyUpdate } from '../controllers/nurseController.js';
import authNurse from '../middleware/authNurse.js';

const nurseRouter = express.Router();

nurseRouter.post('/register', registerNurse);
nurseRouter.post('/login', loginNurse);

// Protected routes
nurseRouter.get('/admissions', authNurse, getAdmissions);
nurseRouter.post('/daily-update', authNurse, addDailyUpdate);

export default nurseRouter;
