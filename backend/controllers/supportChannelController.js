import callLogModel from '../models/callLogModel.js';
import emergencyAlertModel from '../models/emergencyAlertModel.js';
import userModel from '../models/userModel.js';
import nurseModel from '../models/nurseModel.js';
import jwt from 'jsonwebtoken';

// Helper to authenticate request
const authenticateRequest = (req) => {
    const { token, atoken } = req.headers;
    let userId = null;
    let isAdmin = false;

    if (atoken) {
        try {
            const token_decode = jwt.verify(atoken, process.env.JWT_SECRET);
            if (token_decode === process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
                isAdmin = true;
            }
        } catch (e) {}
    }

    if (token) {
        try {
            const token_decode = jwt.verify(token, process.env.JWT_SECRET);
            userId = token_decode.id;
        } catch (e) {}
    }

    return { userId, isAdmin };
};

// Log telephone call support notes
export const logCallSupport = async (req, res) => {
    try {
        const { patientId, executiveName, callNotes, isEscalated, escalatedDoctorId, status } = req.body;
        const { isAdmin } = authenticateRequest(req);

        if (!isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        if (!patientId || !callNotes) {
            return res.json({ success: false, message: "Patient ID and call notes are required" });
        }

        const callLog = await callLogModel.create({
            patientId,
            executiveName: executiveName || 'Receptionist',
            callNotes,
            isEscalated: isEscalated || false,
            escalatedDoctorId: escalatedDoctorId || null,
            status: status || 'resolved'
        });

        res.json({ success: true, message: "Call notes saved successfully", callLog });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Trigger Emergency Hotline
export const triggerEmergencyHotline = async (req, res) => {
    try {
        const { location } = req.body;
        const { userId } = authenticateRequest(req);

        if (!userId) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const alert = await emergencyAlertModel.create({
            patientId: userId,
            location: location || 'Shared Location',
            status: 'triggered'
        });

        res.json({ success: true, message: "Emergency Hotline Alert Triggered!", alert });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Update Emergency Status (Admins/Emergency team)
export const updateEmergencyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedAmbulance, assignedDoctorId, assignedNurseId } = req.body;
        const { isAdmin } = authenticateRequest(req);

        if (!isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const alert = await emergencyAlertModel.findByIdAndUpdate(
            id,
            { status, assignedAmbulance, assignedDoctorId, assignedNurseId },
            { new: true }
        )
        .populate('patientId', 'name email phone')
        .populate('assignedDoctorId', 'name speciality')
        .populate('assignedNurseId', 'name');

        if (!alert) {
            return res.json({ success: false, message: "Emergency alert not found" });
        }

        // Realtime Socket Notify patient of dispatch!
        const io = req.app.get('socketio');
        if (io && alert.patientId) {
            console.log(`Emitting emergencyDispatched to patient user_${alert.patientId._id.toString()}`);
            io.to(`user_${alert.patientId._id.toString()}`).emit('emergencyDispatched', alert);
        }

        res.json({ success: true, message: "Emergency status updated", alert });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Fetch call logs
export const getCallLogs = async (req, res) => {
    try {
        const { userId, isAdmin } = authenticateRequest(req);
        if (!userId && !isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const query = {};
        if (!isAdmin) {
            query.patientId = userId;
        }

        const logs = await callLogModel.find(query)
            .populate('patientId', 'name email phone')
            .populate('escalatedDoctorId', 'name speciality')
            .sort({ createdAt: -1 });

        res.json({ success: true, logs });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Fetch emergency alerts
export const getEmergencies = async (req, res) => {
    try {
        const { userId, isAdmin } = authenticateRequest(req);
        if (!userId && !isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const query = {};
        if (!isAdmin) {
            query.patientId = userId;
        }

        const alerts = await emergencyAlertModel.find(query)
            .populate('patientId', 'name email phone')
            .populate('assignedDoctorId', 'name speciality')
            .populate('assignedNurseId', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, alerts });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Fetch all nurses list (Admin only)
export const getNurses = async (req, res) => {
    try {
        const { isAdmin } = authenticateRequest(req);
        if (!isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }
        const nurses = await nurseModel.find({}).select('-password');
        res.json({ success: true, nurses });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};
