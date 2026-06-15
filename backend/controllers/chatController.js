import chatSessionModel from '../models/chatSessionModel.js';
import chatMessageModel from '../models/chatMessageModel.js';
import aiConversationModel from '../models/aiConversationModel.js';
import attachmentModel from '../models/attachmentModel.js';
import { generateAIResponse } from '../config/aiService.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Create or retrieve a chat session for a patient
export const getOrCreateSession = async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;
    let session = await chatSessionModel.findOne({ patientId, doctorId });
    if (!session) {
      session = await chatSessionModel.create({ patientId, doctorId, status: 'active' });
    }
    // Populate patient details
    const populatedSession = await chatSessionModel.findById(session._id)
      .populate('patientId', 'name email phone');

    res.json({ success: true, session: populatedSession });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Save a message and handle AI reply/Human handoff
export const postMessage = async (req, res) => {
  try {
    const { sessionId, senderId, content, senderType, senderName, attachment, attachmentType } = req.body;

    if (!content && !attachment) {
      return res.json({ success: false, message: "Message content or attachment is required" });
    }

    // 1. Create client message
    const message = await chatMessageModel.create({
      sessionId,
      senderId,
      senderType,
      senderName,
      content: content || '',
      attachment: attachment || '',
      attachmentType: attachmentType || null,
      status: 'sent'
    });

    // Update last message in the session
    const session = await chatSessionModel.findById(sessionId);
    if (!session) {
      return res.json({ success: false, message: "Chat session not found" });
    }

    session.lastMessage = attachment ? `[Sent ${attachmentType}]` : content;
    session.lastMessageAt = Date.now();

    // Increment unread counts
    if (senderType === 'user') {
      session.unreadCountAdmin += 1;
    } else {
      session.unreadCountUser += 1;
    }
    await session.save();

    // 2. AI logic if AI is enabled and session is not assigned to a human agent, and sender is user
    let aiReplyMessage = null;
    if (senderType === 'user' && session.isAIEnabled && !session.isAssignedToHuman) {
      // Get conversation history for Gemini context
      const history = await chatMessageModel.find({ sessionId }).sort({ createdAt: -1 }).limit(10);
      
      // Reverse history to keep chronological order
      const chatHistory = history.reverse();

      const aiReply = await generateAIResponse(content || '[Sent attachment]', chatHistory);
      if (aiReply) {
        let text = aiReply.text;
        let isHandoff = false;

        // Check if handoff was triggered
        if (text.includes('[HUMAN_TRANSFER]')) {
          text = text.replace('[HUMAN_TRANSFER]', '').trim();
          isHandoff = true;
        }

        // Create AI message in DB
        aiReplyMessage = await chatMessageModel.create({
          sessionId,
          senderId: 'AI',
          senderType: 'ai',
          senderName: 'Aura',
          content: text,
          status: 'read' // AI messages are read immediately
        });

        // Log AI conversation details
        try {
          await aiConversationModel.create({
            sessionId,
            prompt: content || '[Sent attachment]',
            response: text,
            suggestedReplies: aiReply.suggestedReplies || []
          });
        } catch (aiLogErr) {
          console.error("AI Logging error:", aiLogErr);
        }

        session.lastMessage = text;
        session.lastMessageAt = Date.now();
        session.unreadCountUser += 1;

        if (isHandoff) {
          session.isAssignedToHuman = true;
          session.unreadCountAdmin += 1; // Needs attention from human agent now
        }
        await session.save();
      }
    }

    res.json({ success: true, message, aiReply: aiReplyMessage });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Fetch messages for a session (with pagination support for infinite scroll)
export const getMessages = async (req, res) => {
  try {
    const { sessionId, limit = 50, before } = req.query;
    
    const query = { sessionId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await chatMessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Reverse to chronological order for client view
    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// --- Admin/Agent Chat Operations ---

// Get all sessions
export const getAllSessions = async (req, res) => {
  try {
    const sessions = await chatSessionModel.find({})
      .populate('patientId', 'name email phone image')
      .populate('doctorId', 'name speciality image')
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, sessions });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Assign/Hand off chat to a human agent
export const assignSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { assignedAgentId, isAssignedToHuman } = req.body;

    const session = await chatSessionModel.findByIdAndUpdate(
      sessionId,
      { 
        isAssignedToHuman: isAssignedToHuman !== undefined ? isAssignedToHuman : true,
        assignedAgentId: assignedAgentId || '',
        unreadCountAdmin: 0 // Clear unread since agent is opening/assigning it
      },
      { new: true }
    ).populate('patientId', 'name email phone');

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, message: "Session assignments updated", session });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Toggle AI assistant enabled/disabled
export const toggleAISession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { isAIEnabled } = req.body;

    const session = await chatSessionModel.findByIdAndUpdate(
      sessionId,
      { isAIEnabled },
      { new: true }
    );

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, message: `AI Assistant ${isAIEnabled ? 'enabled' : 'disabled'}`, session });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Clear session unread counts
export const markSessionRead = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userType } = req.body; // 'user' or 'admin'

    const update = {};
    if (userType === 'admin') {
      update.unreadCountAdmin = 0;
    } else {
      update.unreadCountUser = 0;
    }

    await chatSessionModel.findByIdAndUpdate(sessionId, update);

    // Also update status of messages in session
    const messageQuery = { sessionId };
    if (userType === 'admin') {
      messageQuery.senderType = 'user';
    } else {
      messageQuery.senderType = { $in: ['admin', 'doctor', 'ai'] };
    }
    await chatMessageModel.updateMany(messageQuery, { status: 'read' });

    res.json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Archive/Close chat session
export const archiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body; // 'active' or 'archived'

    const session = await chatSessionModel.findByIdAndUpdate(
      sessionId,
      { status: status || 'archived' },
      { new: true }
    );

    res.json({ success: true, message: `Session status set to ${session.status}`, session });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Export raw chat history as text
export const exportChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await chatSessionModel.findById(sessionId).populate('patientId', 'name email');
    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    const messages = await chatMessageModel.find({ sessionId }).sort({ createdAt: 1 });

    let exportText = `=========================================\n`;
    exportText += `CHAT SESSION EXPORT\n`;
    exportText += `Session ID: ${session._id}\n`;
    exportText += `Patient: ${session.patientId ? session.patientId.name : 'N/A'} (${session.patientId ? session.patientId.email : 'N/A'})\n`;
    exportText += `Assigned Agent: ${session.assignedAgentId || 'None'}\n`;
    exportText += `AI Assistant Enabled: ${session.isAIEnabled}\n`;
    exportText += `Export Date: ${new Date().toISOString()}\n`;
    exportText += `=========================================\n\n`;

    messages.forEach(m => {
      const timestamp = new Date(m.createdAt).toLocaleString();
      const sender = m.senderName || m.senderType.toUpperCase();
      exportText += `[${timestamp}] ${sender}: ${m.content}\n`;
      if (m.attachment) {
        exportText += `   *Attachment [${m.attachmentType}]: ${m.attachment}\n`;
      }
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=chat-history-${sessionId}.txt`);
    res.send(exportText);
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

// Upload attachment (image or generic file)
export const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: "No file uploaded" });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: resourceType
    });

    // Remove local temp file
    fs.unlinkSync(req.file.path);

    // Log the file details inside the Attachment collection
    try {
      await attachmentModel.create({
        url: uploadResult.secure_url,
        filename: req.file.originalname,
        fileType: isImage ? 'image' : 'file',
        uploadedBy: req.body.userId || 'system'
      });
    } catch (attachmentLogErr) {
      console.error("Attachment log failed:", attachmentLogErr);
    }

    res.json({
      success: true,
      url: uploadResult.secure_url,
      type: isImage ? 'image' : 'file'
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};
