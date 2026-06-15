import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
    senderId: { type: String, required: true }, // Can be userId or 'admin'
    senderType: { type: String, enum: ['user', 'admin'], required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    attachment: { type: String, default: '' } // Attachments for replies
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true }, // Formatted like TICK-1234
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open' },
    category: { 
        type: String, 
        enum: ['General', 'Appointment', 'Billing', 'Medical Inquiry', 'Feedback'], 
        default: 'General' 
    },
    assignedAgentId: { type: String, default: '' }, // Admin email or ID
    agentNotes: { type: String, default: '' }, // Auto-saved private agent notes
    replies: [replySchema]
}, { timestamps: true });

const ticketModel = mongoose.models.ticket || mongoose.model("ticket", ticketSchema);
export default ticketModel;
