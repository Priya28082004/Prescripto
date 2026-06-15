import express from 'express';
import { registerFamily, loginFamily, getPatientStatus } from '../controllers/familyController.js';
import authFamily from '../middleware/authFamily.js';

const familyRouter = express.Router();

familyRouter.post('/register', registerFamily);
familyRouter.post('/login', loginFamily);

// Protected routes
familyRouter.get('/patient-status', authFamily, getPatientStatus);

export default familyRouter;
