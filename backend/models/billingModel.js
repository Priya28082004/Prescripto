import mongoose from "mongoose";

const billingSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    doctorFees: { type: Number, required: true },
    testCharges: { type: Number, default: 0 },
    medicineCharges: { type: Number, default: 0 },
    roomCharges: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Card/UPI', 'Insurance', 'Pending'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['Pending', 'Confirmed'], default: 'Pending' },
    billingDate: { type: Number, default: Date.now },
    invoiceNumber: { type: String, required: true, unique: true }
});

const billingModel = mongoose.models.billing || mongoose.model("billing", billingSchema);
export default billingModel;
