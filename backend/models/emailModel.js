import mongoose from "mongoose";

const emailSchema = new mongoose.Schema({
    ticketId: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' }
}, { timestamps: true });

const emailModel = mongoose.models.email || mongoose.model("email", emailSchema);
export default emailModel;
