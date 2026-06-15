import mongoose from "mongoose"

const nurseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: " " },
    assigned_ward: { type: String, default: "General" },
    date: { type: Number, default: Date.now }
})

const nurseModel = mongoose.models.nurse || mongoose.model("nurse", nurseSchema)
export default nurseModel
