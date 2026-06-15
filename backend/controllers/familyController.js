import validator from "validator"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import familyModel from "../models/familyModel.js"
import admissionModel from "../models/admissionModel.js"
import dailyUpdateModel from "../models/dailyUpdateModel.js"
import userModel from "../models/userModel.js"

// API for Family Registration
const registerFamily = async (req, res) => {
    try {
        const { name, email, password, patientEmail, relation } = req.body;
        if (!name || !email || !password || !patientEmail || !relation) {
            return res.json({ success: false, message: 'Missing Details' })
        }
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        const patient = await userModel.findOne({ email: patientEmail })
        if (!patient) {
            return res.json({ success: false, message: "Connected patient email not found in records" })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)

        const familyData = {
            name,
            email,
            password: hashedPassword,
            patientId: patient._id,
            relation
        }

        const newFamily = new familyModel(familyData)
        const family = await newFamily.save()
        const token = jwt.sign({ id: family._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API for Family Login
const loginFamily = async (req, res) => {
    try {
        const { email, password } = req.body;
        const family = await familyModel.findOne({ email })
        if (!family) {
            return res.json({ success: false, message: "Family account does not exist" })
        }
        const isMatch = await bcrypt.compare(password, family.password)
        if (isMatch) {
            const token = jwt.sign({ id: family._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get Patient Status & Updates for connected Family Member
const getPatientStatus = async (req, res) => {
    try {
        const { familyId } = req.body; // Set by authFamily middleware
        const family = await familyModel.findById(familyId)
        if (!family) {
            return res.json({ success: false, message: "Family not found" })
        }

        const patient = await userModel.findById(family.patientId).select("-password")
        const admission = await admissionModel.findOne({ patientId: family.patientId, status: "Admitted" }).sort({ admission_date: -1 })

        if (!admission) {
             return res.json({ success: true, message: "Patient is currently not admitted.", admitted: false, patient })
        }

        const timeline = await dailyUpdateModel.find({ admissionId: admission._id }).sort({ date: -1 })
        
        res.json({ success: true, patient, admission, timeline, admitted: true })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export { registerFamily, loginFamily, getPatientStatus }
