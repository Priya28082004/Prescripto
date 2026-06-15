import express from 'express';
import { loginAdmin, appointmentsAdmin, appointmentCancel, addDoctor, allDoctors, adminDashboard, admitPatient, dischargePatient, initBeds, getBeds, getInpatients, addTreatment } from '../controllers/adminController.js';
import { changeAvailablity } from '../controllers/doctorController.js';
import authAdmin from '../middleware/authAdmin.js';
import upload from '../middleware/multer.js';
const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin)
adminRouter.post("/add-doctor", authAdmin, upload.single('image'), addDoctor)
adminRouter.get("/appointments", authAdmin, appointmentsAdmin)
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel)
adminRouter.get("/all-doctors", authAdmin, allDoctors)
adminRouter.post("/change-availability", authAdmin, changeAvailablity)
adminRouter.get("/dashboard", authAdmin, adminDashboard)
adminRouter.post("/admit-patient", authAdmin, admitPatient)
adminRouter.post("/discharge-patient", authAdmin, dischargePatient)

// New HMS Admin Routes
adminRouter.post("/init-beds", initBeds)
adminRouter.get("/beds", authAdmin, getBeds)
adminRouter.get("/inpatients", authAdmin, getInpatients)
adminRouter.post("/add-treatment", authAdmin, addTreatment)

export default adminRouter;