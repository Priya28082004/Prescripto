import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    filename: { type: String },
    fileType: { type: String, enum: ['image', 'file'], required: true },
    uploadedBy: { type: String, required: true } // userId or adminId
}, { timestamps: true });

const attachmentModel = mongoose.models.attachment || mongoose.model("attachment", attachmentSchema);
export default attachmentModel;
