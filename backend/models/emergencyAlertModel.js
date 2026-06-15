import mongoose from "mongoose";

const emergencyAlertSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    location: { type: String, default: 'Shared Location' },
    status: { type: String, enum: ['triggered', 'ambulance_assigned', 'doctor_assigned', 'dispatched', 'resolved'], default: 'triggered' },
    assignedAmbulance: { type: String, default: '' },
    assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'doctor' },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'nurse' }
}, { timestamps: true });

const emergencyAlertModel = mongoose.models.emergencyAlert || mongoose.model("emergencyAlert", emergencyAlertSchema);
export default emergencyAlertModel;
