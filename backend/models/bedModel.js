import mongoose from "mongoose";

const bedSchema = new mongoose.Schema({
    wardType: { type: String, required: true, enum: ['General', 'ICU'] },
    bedNumber: { type: String, required: true, unique: true },
    isAvailable: { type: Boolean, default: true },
    currentAdmissionId: { type: String, default: null },
    dailyRate: { type: Number, required: true }
});

const bedModel = mongoose.models.bed || mongoose.model("bed", bedSchema);
export default bedModel;
