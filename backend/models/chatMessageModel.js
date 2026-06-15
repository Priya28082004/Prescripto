import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'chatSession', required: true },
    senderId: { type: String, required: true }, // Can be userId, doctorId, 'admin', or 'ai'
    senderType: { type: String, enum: ['user', 'doctor', 'admin', 'ai'], required: true },
    senderName: { type: String, required: true },
    content: { type: String, default: '' },
    attachment: { type: String, default: '' }, // Cloudinary URL if file/image uploaded
    attachmentType: { type: String, enum: ['image', 'file', null], default: null },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
}, { timestamps: true });

const chatMessageModel = mongoose.models.chatMessage || mongoose.model("chatMessage", chatMessageSchema);
export default chatMessageModel;
