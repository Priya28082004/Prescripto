import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    executiveName: { type: String, default: 'Receptionist' },
    callNotes: { type: String, required: true },
    isEscalated: { type: Boolean, default: false },
    escalatedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'doctor' },
    status: { type: String, enum: ['resolved', 'escalated', 'closed'], default: 'resolved' }
}, { timestamps: true });

const callLogModel = mongoose.models.callLog || mongoose.model("callLog", callLogSchema);
export default callLogModel;
