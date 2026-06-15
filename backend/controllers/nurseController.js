import validator from "validator"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import nurseModel from "../models/nurseModel.js"
import admissionModel from "../models/admissionModel.js"
import dailyUpdateModel from "../models/dailyUpdateModel.js"

// API for Nurse Registration
const registerNurse = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)

        const nurseData = {
            name,
            email,
            password: hashedPassword,
        }

        const newNurse = new nurseModel(nurseData)
        const nurse = await newNurse.save()
        const token = jwt.sign({ id: nurse._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API for Nurse Login
const loginNurse = async (req, res) => {
    try {
        const { email, password } = req.body;
        const nurse = await nurseModel.findOne({ email })
        if (!nurse) {
            return res.json({ success: false, message: "Nurse does not exist" })
        }
        const isMatch = await bcrypt.compare(password, nurse.password)
        if (isMatch) {
            const token = jwt.sign({ id: nurse._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API for Nurse to fetch all ongoing admissions
const getAdmissions = async (req, res) => {
    try {
        const admissions = await admissionModel.find({ status: "Admitted" })
        res.json({ success: true, admissions })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API for Nurse to add daily health update
const addDailyUpdate = async (req, res) => {
    try {
        const { nurseId, admissionId, bp, heart_rate, temperature, notes } = req.body
        if (!nurseId || !admissionId || !bp || !heart_rate || !temperature) {
             return res.json({ success: false, message: "Missing required vitals" })
        }

        const updateData = { nurseId, admissionId, bp, heart_rate, temperature, notes, date: Date.now() }
        const newUpdate = new dailyUpdateModel(updateData)
        await newUpdate.save()

        res.json({ success: true, message: "Daily update recorded successfully" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export { registerNurse, loginNurse, getAdmissions, addDailyUpdate }
