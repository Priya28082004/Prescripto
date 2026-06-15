import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'doctor' }, // For direct patient-doctor chats
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isAIEnabled: { type: Boolean, default: true },
    isAssignedToHuman: { type: Boolean, default: false },
    assignedAgentId: { type: String }, // Admins / Support Agents
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCountUser: { type: Number, default: 0 },
    unreadCountAdmin: { type: Number, default: 0 }
}, { timestamps: true });

const chatSessionModel = mongoose.models.chatSession || mongoose.model("chatSession", chatSessionSchema);
export default chatSessionModel;
