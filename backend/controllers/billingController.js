import billingModel from "../models/billingModel.js";
import appointmentModel from "../models/appointmentModel.js";

// API to generate or update a bill for an appointment (Admin Panel)
const generateBill = async (req, res) => {
    try {
        const { appointmentId, doctorFees, testCharges, medicineCharges, roomCharges, discount, tax } = req.body;

        if (!appointmentId || doctorFees === undefined) {
            return res.json({ success: false, message: "Missing required billing details" });
        }

        const appointment = await appointmentModel.findById(appointmentId);
        if (!appointment) {
            return res.json({ success: false, message: "Appointment not found" });
        }

        // Calculate billing figures
        const docFeesNum = Number(doctorFees);
        const testChgNum = Number(testCharges || 0);
        const medChgNum = Number(medicineCharges || 0);
        const roomChgNum = Number(roomCharges || 0);
        const discNum = Number(discount || 0);
        const taxNum = Number(tax || 0);

        const subtotal = docFeesNum + testChgNum + medChgNum + roomChgNum;
        const total = subtotal - discNum + taxNum;

        // Check if a billing record already exists for this appointment
        let billingRecord = await billingModel.findOne({ appointmentId });

        if (billingRecord) {
            // Update existing billing record
            billingRecord.doctorFees = docFeesNum;
            billingRecord.testCharges = testChgNum;
            billingRecord.medicineCharges = medChgNum;
            billingRecord.roomCharges = roomChgNum;
            billingRecord.discount = discNum;
            billingRecord.tax = taxNum;
            billingRecord.subtotal = subtotal;
            billingRecord.total = total;
            await billingRecord.save();
        } else {
            // Generate a unique invoice number: INV-[Timestamp]-[Random]
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(1000 + Math.random() * 9000);
            const invoiceNumber = `INV-${timestamp}-${random}`;

            // Create new billing record
            billingRecord = new billingModel({
                appointmentId,
                userId: appointment.userId,
                docId: appointment.docId,
                doctorFees: docFeesNum,
                testCharges: testChgNum,
                medicineCharges: medChgNum,
                roomCharges: roomChgNum,
                discount: discNum,
                tax: taxNum,
                subtotal,
                total,
                paymentMethod: 'Pending',
                paymentStatus: 'Pending',
                invoiceNumber
            });
            await billingRecord.save();
        }

        // Emit realtime socket event if SocketIO is set up
        const io = req.app.get('socketio');
        if (io) {
            io.to(`user_${appointment.userId}`).emit('billGenerated', {
                appointmentId,
                invoiceNumber: billingRecord.invoiceNumber,
                total
            });
        }

        res.json({ success: true, message: "Bill generated successfully", billing: billingRecord });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get billing details for an appointment (Patient and Admin panels)
const getBillByAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const billing = await billingModel.findOne({ appointmentId }).lean();
        if (!billing) {
            return res.json({ success: false, message: "No billing record found for this appointment" });
        }

        // Fetch corresponding appointment to enrich
        const appointment = await appointmentModel.findById(appointmentId).lean();
        const enrichedBilling = {
            ...billing,
            patientData: appointment ? appointment.userData : { name: "N/A" },
            docData: appointment ? appointment.docData : { name: "N/A" },
            slotDate: appointment ? appointment.slotDate : "",
            slotTime: appointment ? appointment.slotTime : ""
        };

        res.json({ success: true, billing: enrichedBilling });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to confirm payment and payment method (Cash, Card/UPI, Insurance Claim)
const updateBillPayment = async (req, res) => {
    try {
        const { appointmentId, paymentMethod, paymentStatus } = req.body;

        if (!appointmentId || !paymentMethod) {
            return res.json({ success: false, message: "Missing required details" });
        }

        const billing = await billingModel.findOne({ appointmentId });
        if (!billing) {
            return res.json({ success: false, message: "No billing record found" });
        }

        billing.paymentMethod = paymentMethod;
        billing.paymentStatus = paymentStatus || 'Confirmed';
        await billing.save();

        // Also update the main appointment's payment flag
        if (billing.paymentStatus === 'Confirmed') {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
        }

        // Notify client
        const io = req.app.get('socketio');
        if (io) {
            io.to(`user_${billing.userId}`).emit('paymentConfirmed', {
                appointmentId,
                paymentMethod,
                invoiceNumber: billing.invoiceNumber
            });
        }

        res.json({ success: true, message: "Payment status updated successfully", billing });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to list all billing reports & records (Admin Panel)
const getAllBills = async (req, res) => {
    try {
        const bills = await billingModel.find({}).sort({ billingDate: -1 }).lean();
        const appointments = await appointmentModel.find({}).lean();
        
        // Map appointments by ID for quick lookup
        const apptMap = {};
        appointments.forEach(app => {
            apptMap[app._id.toString()] = app;
        });

        // Attach appointment, patient and doc data to bills
        const enrichedBills = bills.map(bill => {
            const app = apptMap[bill.appointmentId];
            return {
                ...bill,
                patientData: app ? app.userData : { name: "N/A" },
                docData: app ? app.docData : { name: "N/A" },
                slotDate: app ? app.slotDate : "",
                slotTime: app ? app.slotTime : ""
            };
        });

        res.json({ success: true, bills: enrichedBills });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    generateBill,
    getBillByAppointment,
    updateBillPayment,
    getAllBills
};
