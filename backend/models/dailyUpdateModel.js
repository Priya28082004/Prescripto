import mongoose from "mongoose"

const dailyUpdateSchema = new mongoose.Schema({
    admissionId: { type: String, required: true },
    nurseId: { type: String, required: true },
    bp: { type: String, required: true },
    heart_rate: { type: String, required: true },
    temperature: { type: String, required: true },
    notes: { type: String, default: "" },
    date: { type: Number, required: true, default: Date.now }
})

const dailyUpdateModel = mongoose.models.dailyUpdate || mongoose.model("dailyUpdate", dailyUpdateSchema)
export default dailyUpdateModel
