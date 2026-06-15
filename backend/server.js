import express from "express"
import cors from 'cors'
import 'dotenv/config'
import http from 'http';
import { Server as SocketIOServer } from "socket.io";
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import nurseRouter from "./routes/nurseRoute.js"
import familyRouter from "./routes/familyRoute.js"
import chatRouter from "./routes/chatRoute.js"
import ticketRouter from "./routes/ticketRoute.js"
import supportChannelRouter from "./routes/supportChannelRoute.js"
import billingRouter from "./routes/billingRoute.js"

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// middlewares
app.use(express.json())
app.use(cors())
app.set('socketio', io);

// Presence tracking map
const onlineUsers = new Map();

// socket.io connection handling
io.on('connection', (socket) => {
  console.log('A client connected', socket.id);

  // User online registration
  socket.on('registerOnline', ({ userId, userType }) => {
    if (userId) {
      onlineUsers.set(userId, { socketId: socket.id, userType });
      console.log(`User registered: ${userId} (${userType})`);
      io.emit('statusUpdate', { userId, status: 'online' });
    }
  });

  // Join patient to a personal room
  socket.on('joinRoom', ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log(`UserJoined personal room: user_${userId}`);
  });

  // Join admin/agent to inbox room for notifications
  socket.on('joinAgentRoom', ({ agentId }) => {
    socket.join(`agent_${agentId}`);
    socket.join('admin_inbox');
    console.log(`Agent ${agentId} joined admin_inbox`);
  });

  // Handle sending a message
  socket.on('sendMessage', (msg) => {
    const { sessionId, senderId, senderType, senderName, content, attachment, attachmentType } = msg;
    io.to(`session_${sessionId}`).emit('newMessage', msg);
    
    if (senderType === 'user') {
      io.to('admin_inbox').emit('newTicketAlert', {
        sessionId,
        senderId,
        senderName,
        content: content || `[Sent ${attachmentType}]`,
        createdAt: new Date()
      });
    }
  });

  // Typing indicators
  socket.on('typing', ({ sessionId, senderName, senderType }) => {
    socket.to(`session_${sessionId}`).emit('typing', { senderName, senderType });
  });

  socket.on('stopTyping', ({ sessionId, senderType }) => {
    socket.to(`session_${sessionId}`).emit('stopTyping', { senderType });
  });

  // Seen receipt handling
  socket.on('markRead', ({ sessionId, userType }) => {
    io.to(`session_${sessionId}`).emit('sessionRead', { sessionId, userType });
  });

  // Join chat session room
  socket.on('joinSession', ({ sessionId }) => {
    socket.join(`session_${sessionId}`);
    console.log(`Socket ${socket.id} joined room session_${sessionId}`);
  });

  // Handle new ticket event
  socket.on('createTicket', (ticketData) => {
    io.to('admin_inbox').emit('newTicketCreated', ticketData);
  });

  // Realtime Emergency Alert Trigger
  socket.on('emergencyAlert', (alertData) => {
    console.log("Emergency alert triggered by patient:", alertData.patientName);
    // Broadcast instantly to all admins in the admin_inbox room
    io.to('admin_inbox').emit('emergencyTriggered', {
      ...alertData,
      triggeredAt: new Date()
    });
  });

  // Realtime Patient Call Init Trigger
  socket.on('patientCallInit', (callData) => {
    console.log("Incoming call initiated by patient:", callData.patientName);
    io.to('admin_inbox').emit('incomingCallAlert', {
      ...callData,
      socketId: socket.id,
      triggeredAt: new Date()
    });
  });

  // Realtime Admin Call Answer
  socket.on('adminCallAnswer', ({ patientSocketId, executiveName }) => {
    console.log("Call answered by admin. Patient socket:", patientSocketId);
    io.to(patientSocketId).emit('callConnected', { executiveName, adminSocketId: socket.id });
    // Notify all OTHER admin sockets that the call has been answered, so they stop ringing!
    socket.to('admin_inbox').emit('callEnded');
  });

  // Realtime Call End / Disconnect
  socket.on('callDisconnected', ({ targetSocketId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('callEnded');
      // If a specific target socket is disconnected, also notify all other admin tabs to clear any alerts/ringing
      if (targetSocketId !== 'admin_inbox') {
        socket.to('admin_inbox').emit('callEnded');
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    let disconnectedUser = null;
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        disconnectedUser = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    
    if (disconnectedUser) {
      console.log(`User offline: ${disconnectedUser}`);
      io.emit('statusUpdate', { userId: disconnectedUser, status: 'offline' });
    }
    console.log('Client disconnected', socket.id);
  });
});

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)
app.use("/api/nurse", nurseRouter)
app.use("/api/family", familyRouter)
app.use("/api/chat", chatRouter)
app.use("/api/ticket", ticketRouter)
app.use("/api/support-channel", supportChannelRouter)
app.use("/api/billing", billingRouter)

app.get("/", (req, res) => {
  res.send("API Working")
});

server.listen(port, () => console.log(`Server started on PORT:${port}`));