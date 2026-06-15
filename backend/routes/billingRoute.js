import express from "express";
import { generateBill, getBillByAppointment, updateBillPayment, getAllBills } from "../controllers/billingController.js";
import authAdmin from "../middleware/authAdmin.js";
import authUser from "../middleware/authUser.js";

const billingRouter = express.Router();

// Route to generate or edit a bill (Admin)
billingRouter.post("/generate", authAdmin, generateBill);

// Route to get a specific bill (Either User token or Admin token is allowed)
billingRouter.get("/appointment/:appointmentId", getBillByAppointment);

// Route to confirm payment (User makes payment or Admin confirms offline cash)
billingRouter.post("/confirm-payment", updateBillPayment);

// Route to fetch all bills for records & reports (Admin)
billingRouter.get("/all", authAdmin, getAllBills);

export default billingRouter;
