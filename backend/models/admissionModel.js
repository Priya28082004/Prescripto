import mongoose from "mongoose"

const admissionSchema = new mongoose.Schema({
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    problem_description: { type: String, required: true },
    required_checkups: { type: Array, default: [] },
    admission_date: { type: Number, required: true, default: Date.now },
    discharge_date: { type: Number, default: null },
    status: { type: String, default: "Admitted" }, // Admitted, Discharged
    bedNumber: { type: String, default: null },
    wardType: { type: String, default: null },
    medicines: { type: Array, default: [] }, // Array of { name, dose, timing }
    treatment_notes: { type: String, default: "" },
    severityLevel: { type: String, default: "Normal" },
    billing: { type: Object, default: { roomCharges: 0, medicinesTotal: 0, doctorFees: 0, testCharges: 0, totalAmount: 0, isPaid: false } },
    discharge_summary: { type: String, default: "" }
})

const admissionModel = mongoose.models.admission || mongoose.model("admission", admissionSchema)
export default admissionModel
