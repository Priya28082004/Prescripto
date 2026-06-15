import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import admissionModel from "../models/admissionModel.js";
import bedModel from "../models/bedModel.js";

// API for admin login
const loginAdmin = async (req, res) => {
    try {

        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}


// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
    try {

        const appointments = await appointmentModel.find({})
        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
    try {

        const { appointmentId } = req.body
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API for adding Doctor
const addDoctor = async (req, res) => {

    try {

        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        // checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing Details" })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        // upload image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
        const imageUrl = imageUpload.secure_url

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()
        res.json({ success: true, message: 'Doctor Added' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select('-password')
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
    try {

        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to init beds
const initBeds = async (req, res) => {
    try {
        const count = await bedModel.countDocuments();
        if (count === 0) {
            const bedsToCreate = [];
            for(let i=1; i<=10; i++) bedsToCreate.push({ wardType: 'General', bedNumber: `GEN-${i}`, dailyRate: 1000 });
            for(let i=1; i<=5; i++) bedsToCreate.push({ wardType: 'ICU', bedNumber: `ICU-${i}`, dailyRate: 5000 });
            for(let i=1; i<=5; i++) bedsToCreate.push({ wardType: 'Private', bedNumber: `PRV-${i}`, dailyRate: 3000 });
            await bedModel.insertMany(bedsToCreate);
            return res.json({ success: true, message: "Beds initialized" });
        }
        res.json({ success: true, message: "Beds already exist" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// API to get beds
const getBeds = async (req, res) => {
    try {
        let beds = await bedModel.find({});
        
        // Auto-initialize beds if none exist
        if (beds.length === 0) {
            const bedsToCreate = [];
            for(let i=1; i<=10; i++) bedsToCreate.push({ wardType: 'General', bedNumber: `GEN-${i}`, dailyRate: 1000 });
            for(let i=1; i<=5; i++) bedsToCreate.push({ wardType: 'ICU', bedNumber: `ICU-${i}`, dailyRate: 5000 });
            for(let i=1; i<=5; i++) bedsToCreate.push({ wardType: 'Private', bedNumber: `PRV-${i}`, dailyRate: 3000 });
            await bedModel.insertMany(bedsToCreate);
            beds = await bedModel.find({});
        }

        res.json({ success: true, beds });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// API to get all hospital active admissions
const getInpatients = async (req, res) => {
    try {
        const admissions = await admissionModel.find({ status: "Admitted" });
        res.json({ success: true, admissions });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// API to admit a patient
const admitPatient = async (req, res) => {
    try {
        const { patientId, doctorId, problem_description, required_checkups, wardType, bedNumber, severityLevel } = req.body;
        if (!patientId || !doctorId || !problem_description || !wardType || !bedNumber) {
            return res.json({ success: false, message: "Missing Details for Admission" })
        }
        
        const bed = await bedModel.findOne({ bedNumber, isAvailable: true });
        if(!bed) return res.json({ success: false, message: "Bed is not available" });

        const admissionData = { 
            patientId, doctorId, problem_description, required_checkups, status: "Admitted",
            wardType, bedNumber, severityLevel: severityLevel || "Normal"
        }
        const newAdmission = new admissionModel(admissionData)
        const savedAdmission = await newAdmission.save()

        await bedModel.findByIdAndUpdate(bed._id, { isAvailable: false, currentAdmissionId: savedAdmission._id });

        res.json({ success: true, message: "Patient admitted successfully" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to add treatment
const addTreatment = async (req, res) => {
    try {
        const { admissionId, newMedicines, additionalNotes } = req.body;
        const admission = await admissionModel.findById(admissionId);
        if(!admission) return res.json({ success: false, message: "Admission not found" });

        let updatedMedicines = admission.medicines;
        if (newMedicines && newMedicines.length > 0) {
            updatedMedicines = [...admission.medicines, ...newMedicines];
        }
        
        let updatedNotes = admission.treatment_notes;
        if (additionalNotes) {
            updatedNotes = updatedNotes ? updatedNotes + "\n" + additionalNotes : additionalNotes;
        }

        await admissionModel.findByIdAndUpdate(admissionId, { medicines: updatedMedicines, treatment_notes: updatedNotes });
        res.json({ success: true, message: "Treatment updated successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// API to discharge a patient
const dischargePatient = async (req, res) => {
    try {
        const { admissionId, doctorFees, testCharges, medicinesTotal, dischargeSummary } = req.body;
        
        const admission = await admissionModel.findById(admissionId);
        if(!admission) return res.json({ success: false, message: "Admission not found" });

        const bed = await bedModel.findOne({ bedNumber: admission.bedNumber });
        let roomCharges = 0;
        if (bed) {
            const daysAdmitted = Math.max(1, Math.ceil((Date.now() - admission.admission_date) / (1000 * 60 * 60 * 24)));
            roomCharges = daysAdmitted * bed.dailyRate;
            
            await bedModel.findByIdAndUpdate(bed._id, { isAvailable: true, currentAdmissionId: null });
        }

        const totalAmount = roomCharges + Number(doctorFees || 0) + Number(testCharges || 0) + Number(medicinesTotal || 0);

        const billing = {
            roomCharges,
            medicinesTotal: Number(medicinesTotal || 0),
            doctorFees: Number(doctorFees || 0),
            testCharges: Number(testCharges || 0),
            totalAmount,
            isPaid: false
        };

        await admissionModel.findByIdAndUpdate(admissionId, { 
            status: "Discharged", 
            discharge_date: Date.now(),
            billing,
            discharge_summary: dischargeSummary || "Discharged with standard protocol"
        });
        
        res.json({ success: true, message: "Patient discharged successfully", billing })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    addDoctor,
    allDoctors,
    adminDashboard,
    initBeds,
    getBeds,
    getInpatients,
    admitPatient,
    addTreatment,
    dischargePatient
}