import ticketModel from '../models/ticketModel.js';
import userModel from '../models/userModel.js';
import chatSessionModel from '../models/chatSessionModel.js';
import chatMessageModel from '../models/chatMessageModel.js';
import { sendTicketEmail } from '../config/emailService.js';
import jwt from 'jsonwebtoken';

// Helper to generate Ticket ID (TICK-XXXX)
const generateTicketId = () => {
    return `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Helper to authenticate user or admin from headers
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

// Create a new support ticket
export const createTicket = async (req, res) => {
    try {
        const { subject, description, priority, category } = req.body;
        const { userId } = authenticateRequest(req);

        if (!userId) {
            return res.json({ success: false, message: "Not Authorized. Please login again." });
        }

        if (!subject || !description) {
            return res.json({ success: false, message: "Subject and Description are required" });
        }

        const patient = await userModel.findById(userId);
        if (!patient) {
            return res.json({ success: false, message: "Patient not found" });
        }

        const ticketId = generateTicketId();

        const ticket = await ticketModel.create({
            ticketId,
            patientId: userId,
            subject,
            description,
            priority: priority || 'medium',
            category: category || 'General'
        });

        // Send email notification to user
        const userHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Support Ticket Created: ${ticketId}</h2>
                <p>Hello ${patient.name},</p>
                <p>We have successfully registered your support request. Our agent will get back to you shortly.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <strong>Subject:</strong> ${subject}<br>
                    <strong>Category:</strong> ${category || 'General'}<br>
                    <strong>Priority:</strong> ${priority || 'medium'}<br>
                    <strong>Description:</strong> ${description}
                </div>
                <p>Best regards,<br>Prescripto Support Team</p>
            </div>
        `;
        await sendTicketEmail({
            to: patient.email,
            subject: `[Prescripto Support] Ticket Created: ${ticketId}`,
            text: `Your ticket ${ticketId} has been created: ${subject}. We will reply shortly.`,
            html: userHtml,
            ticketId
        });

        res.json({ success: true, message: "Ticket created successfully", ticket });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Fetch tickets (patients see their own, admins see all)
export const getTickets = async (req, res) => {
    try {
        const { userId, isAdmin } = authenticateRequest(req);
        
        if (!userId && !isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const query = {};
        if (!isAdmin) {
            query.patientId = userId;
        }

        const tickets = await ticketModel.find(query)
            .populate('patientId', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({ success: true, tickets });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Fetch a specific ticket details
export const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, isAdmin } = authenticateRequest(req);

        if (!userId && !isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const ticket = await ticketModel.findById(id).populate('patientId', 'name email phone');
        if (!ticket) {
            return res.json({ success: false, message: "Ticket not found" });
        }

        // Validate that user owns this ticket
        if (!isAdmin && ticket.patientId._id.toString() !== userId) {
            return res.json({ success: false, message: "Access Denied" });
        }

        res.json({ success: true, ticket });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Add a reply to a support ticket
export const addReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, attachment } = req.body;
        const { userId, isAdmin } = authenticateRequest(req);

        if (!userId && !isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        if (!content) {
            return res.json({ success: false, message: "Reply content cannot be empty" });
        }

        const ticket = await ticketModel.findById(id).populate('patientId', 'name email');
        if (!ticket) {
            return res.json({ success: false, message: "Ticket not found" });
        }

        if (!isAdmin && ticket.patientId._id.toString() !== userId) {
            return res.json({ success: false, message: "Access Denied" });
        }

        const senderType = isAdmin ? 'admin' : 'user';
        let senderName = 'Patient';
        
        if (isAdmin) {
            senderName = 'Admin Support';
        } else {
            const patient = await userModel.findById(userId);
            if (patient) senderName = patient.name;
        }

        // Push new reply
        ticket.replies.push({
            senderId: isAdmin ? 'admin' : userId,
            senderType,
            senderName,
            content,
            attachment: attachment || ''
        });

        // Update status
        if (isAdmin) {
            ticket.status = 'pending';
        } else {
            ticket.status = 'open';
        }

        await ticket.save();

        // Trigger Email Notification
        if (isAdmin) {
            const userHtml = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Support Agent Replied: ${ticket.ticketId}</h2>
                    <p>Hello ${ticket.patientId.name},</p>
                    <p>An agent has updated your support ticket.</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <strong>Reply from ${senderName}:</strong><br>
                        ${content}
                    </div>
                    <p>Reply directly via the Support Hub in our portal if you have further questions.</p>
                    <p>Best regards,<br>Prescripto Support Team</p>
                </div>
            `;
            await sendTicketEmail({
                to: ticket.patientId.email,
                subject: `[Prescripto Support] New Reply: ${ticket.ticketId}`,
                text: `Agent ${senderName} replied to ticket ${ticket.ticketId}: ${content}`,
                html: userHtml,
                ticketId: ticket.ticketId
            });
        } else {
            const adminHtml = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Patient Replied: ${ticket.ticketId}</h2>
                    <p>Patient ${ticket.patientId.name} (${ticket.patientId.email}) has added a reply to their ticket.</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <strong>Reply:</strong><br>
                        ${content}
                    </div>
                    <p>View and manage this ticket in the Admin Dashboard.</p>
                </div>
            `;
            await sendTicketEmail({
                to: process.env.ADMIN_EMAIL || 'admin@example.com',
                subject: `[Prescripto Support Admin] Patient Reply: ${ticket.ticketId}`,
                text: `Patient ${ticket.patientId.name} replied to ticket ${ticket.ticketId}: ${content}`,
                html: adminHtml,
                ticketId: ticket.ticketId
            });
        }

        res.json({ success: true, ticket });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Update Ticket Status
export const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { isAdmin } = authenticateRequest(req);

        if (!isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        if (!status) {
            return res.json({ success: false, message: "Status is required" });
        }

        const ticket = await ticketModel.findById(id).populate('patientId', 'name email');
        if (!ticket) {
            return res.json({ success: false, message: "Ticket not found" });
        }

        ticket.status = status;
        await ticket.save();

        // Notify user about status change
        const statusHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Support Ticket Status Update: ${ticket.ticketId}</h2>
                <p>Hello ${ticket.patientId.name},</p>
                <p>Your support ticket status has been updated to: <strong>${status.toUpperCase()}</strong>.</p>
                <p>If you feel this was done in error or need additional support, feel free to reply to the ticket in your portal.</p>
                <p>Best regards,<br>Prescripto Support Team</p>
            </div>
        `;
        await sendTicketEmail({
            to: ticket.patientId.email,
            subject: `[Prescripto Support] Ticket Status Updated to ${status.toUpperCase()}: ${ticket.ticketId}`,
            text: `Your ticket ${ticket.ticketId} status has been updated to ${status}.`,
            html: statusHtml,
            ticketId: ticket.ticketId
        });

        res.json({ success: true, message: "Status updated successfully", ticket });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Auto-save Agent Private Notes
export const updateAgentNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { agentNotes } = req.body;
        const { isAdmin } = authenticateRequest(req);

        if (!isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const ticket = await ticketModel.findByIdAndUpdate(
            id,
            { agentNotes: agentNotes || '' },
            { new: true }
        );

        if (!ticket) {
            return res.json({ success: false, message: "Ticket not found" });
        }

        res.json({ success: true, message: "Agent notes saved", ticket });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

// Fetch Analytics Stats
export const getAnalyticsStats = async (req, res) => {
    try {
        const { isAdmin } = authenticateRequest(req);

        if (!isAdmin) {
            return res.json({ success: false, message: "Not Authorized" });
        }

        const totalTickets = await ticketModel.countDocuments();
        const openTickets = await ticketModel.countDocuments({ status: 'open' });
        const pendingTickets = await ticketModel.countDocuments({ status: 'pending' });
        const resolvedTickets = await ticketModel.countDocuments({ status: 'resolved' });
        const closedTickets = await ticketModel.countDocuments({ status: 'closed' });

        const urgentTickets = await ticketModel.countDocuments({ priority: 'urgent' });
        const highTickets = await ticketModel.countDocuments({ priority: 'high' });
        const mediumTickets = await ticketModel.countDocuments({ priority: 'medium' });
        const lowTickets = await ticketModel.countDocuments({ priority: 'low' });

        const chatSessions = await chatSessionModel.countDocuments();
        const activeChats = await chatSessionModel.countDocuments({ status: 'active' });
        const totalMessages = await chatMessageModel.countDocuments();

        const categories = ['General', 'Appointment', 'Billing', 'Medical Inquiry', 'Feedback'];
        const categoryData = {};
        for (const cat of categories) {
            categoryData[cat] = await ticketModel.countDocuments({ category: cat });
        }

        res.json({
            success: true,
            stats: {
                tickets: {
                    total: totalTickets,
                    open: openTickets,
                    pending: pendingTickets,
                    resolved: resolvedTickets,
                    closed: closedTickets,
                    byPriority: { low: lowTickets, medium: mediumTickets, high: highTickets, urgent: urgentTickets }
                },
                chats: {
                    total: chatSessions,
                    active: activeChats,
                    totalMessages
                },
                categoryBreakdown: categoryData
            }
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};
