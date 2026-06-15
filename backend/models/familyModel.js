import mongoose from "mongoose"

const familySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    patientId: { type: String, required: true },
    relation: { type: String, required: true },
    date: { type: Number, default: Date.now }
})

const familyModel = mongoose.models.family || mongoose.model("family", familySchema)
export default familyModel
