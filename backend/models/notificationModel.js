import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId: { type: String, required: true }, // Can be userId, doctorId, or 'admin'
    recipientType: { type: String, enum: ['user', 'doctor', 'admin'], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: { type: String, enum: ['chat', 'ticket', 'system'], default: 'system' }
}, { timestamps: true });

const notificationModel = mongoose.models.notification || mongoose.model("notification", notificationSchema);
export default notificationModel;
