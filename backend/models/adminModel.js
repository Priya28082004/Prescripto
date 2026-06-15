import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin', 'agent', 'staff'], default: 'agent' },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' }
}, { timestamps: true });

const adminModel = mongoose.models.admin || mongoose.model("admin", adminSchema);
export default adminModel;
