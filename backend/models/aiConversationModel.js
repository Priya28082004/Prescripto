import mongoose from "mongoose";

const aiConversationSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'chatSession', required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    suggestedReplies: [{ type: String }]
}, { timestamps: true });

const aiConversationModel = mongoose.models.aiConversation || mongoose.model("aiConversation", aiConversationSchema);
export default aiConversationModel;
