import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AdminContext } from '../../context/AdminContext';
import { toast } from 'react-toastify';
import { 
  MessageSquare, FileText, User, Send, Paperclip, Smile, Sparkles, 
  Settings, CheckCheck, RefreshCw, Volume2, VolumeX, Moon, Sun, 
  Download, Eye, UserCheck, ShieldAlert, AlertCircle, BarChart2,
  Truck, MapPin, PhoneCall, PhoneOff, Phone
} from 'lucide-react';

// Web Audio API custom synthesiser for notification sound
const playAdminSound = (type = 'newMessage') => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (type === 'ringtone') {
      // Telephone ring: double beep repeated
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, audioCtx.currentTime);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.6);
      gain.gain.setValueAtTime(0, audioCtx.currentTime + 1.0);
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 1.2);
      osc2.stop(audioCtx.currentTime + 1.2);
    } else if (type === 'siren') {
      // Emergency siren
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.8);
      osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 1.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } else if (type === 'newTicket') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      // Urgent attention high double beep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain2.gain.setValueAtTime(0.06, audioCtx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc2.start(audioCtx.currentTime + 0.08);
      osc2.stop(audioCtx.currentTime + 0.25);
    } else {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      // Standard chat incoming blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    }
  } catch (e) {
    console.warn("Sound blocked by user agent presence restrictions:", e);
  }
};

const UnifiedInbox = () => {
  const { 
    aToken, backendUrl, 
    incomingCall, setIncomingCall,
    activeCall, setActiveCall,
    callTimer, setCallTimer,
    callNotes, setCallNotes,
    callStatus, setCallStatus,
    callEscalatedDoctor, setCallEscalatedDoctor,
    emergencies, setEmergencies,
    soundEnabled, setSoundEnabled,
    fetchEmergencies, playAdminSound,
    answerIncomingCall, declineIncomingCall, hangUpActiveCall,
    socketRef,
    socket
  } = useContext(AdminContext);
  
  // Lists
  const [sessions, setSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  
  // Selection
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'tickets'
  const [activeSession, setActiveSession] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [activeCallLog, setActiveCallLog] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Inputs
  const [inputText, setInputText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Settings/UI
  const [darkMode, setDarkMode] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState({ status: 'all', priority: 'all' });
  const [uploading, setUploading] = useState(false);

  // Staff Lists
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);

  // Emergency States
  const [activeEmergency, setActiveEmergency] = useState(null); // emergency alert being edited in dispatch modal
  const [dispatchAmbulance, setDispatchAmbulance] = useState('Prescripto-EMS-01');
  const [dispatchDoctor, setDispatchDoctor] = useState('');
  const [dispatchNurse, setDispatchNurse] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const noteDebounceRef = useRef(null);
  const fileInputRef = useRef(null);
  const replyFileRef = useRef(null);

  const emojis = ['👍', '😊', '🙏', '🏥', '📋', '📞', '💊', '👨‍⚕️', '🩺', '✅'];

  // Load chat sessions
  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/chat/sessions`, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load active chats");
    }
  };

  // Load support tickets
  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/ticket/list`, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setTickets(res.data.tickets);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    }
  };

  // Load call logs
  const fetchCallLogs = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/support-channel/call/list`, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setCallLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Emergency Handling ----
  const dispatchEmergencyHelp = async () => {
    if (!activeEmergency) return;
    try {
      const res = await axios.post(`${backendUrl}/api/support-channel/emergency/status/${activeEmergency._id}`, {
        status: 'dispatched',
        assignedAmbulance: dispatchAmbulance,
        assignedDoctorId: dispatchDoctor,
        assignedNurseId: dispatchNurse
      }, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        toast.success("🚀 Medical Assistance Dispatched! Patient notified in real-time.");
        fetchEmergencies();
        setActiveEmergency(null);
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to dispatch help.");
    }
  };

  const resolveEmergency = async () => {
    if (!activeEmergency) return;
    try {
      const res = await axios.post(`${backendUrl}/api/support-channel/emergency/status/${activeEmergency._id}`, {
        status: 'resolved'
      }, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        toast.success("Emergency marked as RESOLVED.");
        fetchEmergencies();
        setActiveEmergency(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load doctors and nurses list
  const loadStaff = async () => {
    try {
      const docRes = await axios.get(`${backendUrl}/api/admin/all-doctors`, {
        headers: { atoken: aToken }
      });
      if (docRes.data.success) {
        setDoctors(docRes.data.doctors);
        if (docRes.data.doctors.length > 0) {
          setDispatchDoctor(docRes.data.doctors[0]._id);
          setCallEscalatedDoctor(docRes.data.doctors[0]._id);
        }
      }
      
      const nurseRes = await axios.get(`${backendUrl}/api/support-channel/nurses`, {
        headers: { atoken: aToken }
      });
      if (nurseRes.data.success) {
        setNurses(nurseRes.data.nurses);
        if (nurseRes.data.nurses.length > 0) {
          setDispatchNurse(nurseRes.data.nurses[0]._id);
        }
      }
    } catch (e) {
      console.error("Failed to load staff list:", e);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchTickets();
    loadStaff();
    fetchEmergencies();
    fetchCallLogs();
  }, [backendUrl]);

  useEffect(() => {
    if (!activeCall && !incomingCall) {
      fetchCallLogs();
    }
  }, [activeCall, incomingCall]);

  // Setup sockets for real-time inbox events (reusing global socket connection)
  useEffect(() => {
    if (!socket) return;

    // Alert on new chat messages
    socket.on('newMessage', (msg) => {
      // If we are currently viewing this session, push to thread
      if (activeSession && activeSession._id === msg.sessionId) {
        setMessages((prev) => [...prev, msg]);
        
        // Auto-mark as read by admin
        axios.post(`${backendUrl}/api/chat/session/read/${activeSession._id}`, { userType: 'admin' }, {
          headers: { atoken: aToken }
        });
        socket.emit('markRead', { sessionId: activeSession._id, userType: 'admin' });
      }
      
      // Update sessions list
      fetchSessions();
    });

    // Alert on new handoffs or user sessions
    socket.on('newTicketAlert', (alert) => {
      toast.info(`New Message from ${alert.senderName}: "${alert.content}"`);
      fetchSessions();
    });

    // Alert on new support tickets created
    socket.on('newTicketCreated', (ticket) => {
      toast.success(`New support ticket created: ${ticket.ticketId}`);
      fetchTickets();
    });

    // Typing indicators
    socket.on('typing', ({ sessionId, senderType }) => {
      if (activeSession && activeSession._id === sessionId && senderType === 'user') {
        setIsTyping(true);
      }
    });

    socket.on('stopTyping', ({ sessionId, senderType }) => {
      if (activeSession && activeSession._id === sessionId && senderType === 'user') {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('newMessage');
      socket.off('newTicketAlert');
      socket.off('newTicketCreated');
      socket.off('typing');
      socket.off('stopTyping');
    };
  }, [activeSession, socket]);

  // Scroll to bottom of message thread
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Load message history when selecting a session
  const selectSession = async (session) => {
    setActiveSession(session);
    setActiveTicket(null);
    setAgentNotes(session.patientId?.agentNotes || '');
    setIsTyping(false);

    try {
      const res = await axios.get(`${backendUrl}/api/chat/messages`, {
        params: { sessionId: session._id },
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setMessages(res.data.messages);
      }

      // Mark session as read
      await axios.post(`${backendUrl}/api/chat/session/read/${session._id}`, { userType: 'admin' }, {
        headers: { atoken: aToken }
      });
      if (socketRef.current) {
        socketRef.current.emit('markRead', { sessionId: session._id, userType: 'admin' });
      }
      
      // Update counts
      fetchSessions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to load chat history");
    }
  };

  // Load ticket details when selecting a ticket
  const selectTicket = (ticket) => {
    setActiveTicket(ticket);
    setActiveSession(null);
    setAgentNotes(ticket.agentNotes || '');
  };

  // Send admin reply in live chat
  const handleSendChatMessage = async () => {
    if (!inputText.trim() || !activeSession) return;

    const textToSend = inputText;
    setInputText('');

    const tempMsg = {
      sessionId: activeSession._id,
      senderId: 'admin',
      senderType: 'admin',
      senderName: 'Admin Agent',
      content: textToSend,
      createdAt: new Date(),
      status: 'sent'
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await axios.post(`${backendUrl}/api/chat/message`, {
        sessionId: activeSession._id,
        senderId: 'admin',
        senderType: 'admin',
        senderName: 'Admin Agent',
        content: textToSend
      }, {
        headers: { atoken: aToken }
      });

      if (res.data.success) {
        if (socketRef.current) {
          socketRef.current.emit('sendMessage', res.data.message);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    }
  };

  // File upload helper for admin replies
  const handleAdminFileUpload = async (e, mode) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${backendUrl}/api/chat/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          atoken: aToken 
        }
      });

      if (res.data.success) {
        if (mode === 'chat') {
          // Send attachment message in chat
          const saveRes = await axios.post(`${backendUrl}/api/chat/message`, {
            sessionId: activeSession._id,
            senderId: 'admin',
            senderType: 'admin',
            senderName: 'Admin Agent',
            content: `Sent ${res.data.type === 'image' ? 'an image' : 'a document'}`,
            attachment: res.data.url,
            attachmentType: res.data.type
          }, {
            headers: { atoken: aToken }
          });

          if (saveRes.data.success) {
            setMessages((prev) => [...prev, saveRes.data.message]);
            if (socketRef.current) {
              socketRef.current.emit('sendMessage', saveRes.data.message);
            }
          }
        } else {
          // Send attachment message in ticket reply
          const saveRes = await axios.post(`${backendUrl}/api/ticket/reply/${activeTicket._id}`, {
            content: replyText || "Attached a file.",
            attachment: res.data.url,
            senderType: 'admin',
            senderName: 'Admin Support',
            senderId: 'admin'
          }, {
            headers: { atoken: aToken }
          });

          if (saveRes.data.success) {
            setActiveTicket(saveRes.data.ticket);
            setReplyText('');
            fetchTickets();
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Send reply in ticket thread
  const handleSendTicketReply = async () => {
    if (!replyText.trim() || !activeTicket) return;

    try {
      const res = await axios.post(`${backendUrl}/api/ticket/reply/${activeTicket._id}`, {
        content: replyText,
        senderType: 'admin',
        senderName: 'Admin Support',
        senderId: 'admin'
      }, {
        headers: { atoken: aToken }
      });

      if (res.data.success) {
        setActiveTicket(res.data.ticket);
        setReplyText('');
        fetchTickets();
        toast.success("Reply sent & email notification dispatched!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send ticket reply");
    }
  };

  // Toggle AI assistant configuration
  const toggleAI = async () => {
    if (!activeSession) return;
    const nextVal = !activeSession.isAIEnabled;
    try {
      const res = await axios.post(`${backendUrl}/api/chat/session/ai/${activeSession._id}`, {
        isAIEnabled: nextVal
      }, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setActiveSession((prev) => ({ ...prev, isAIEnabled: nextVal }));
        toast.success(`AI assistant has been ${nextVal ? 'enabled' : 'disabled'}`);
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assign agent or update handoff
  const toggleAssign = async (agentName) => {
    if (!activeSession) return;
    const isAssigned = activeSession.isAssignedToHuman;
    try {
      const res = await axios.post(`${backendUrl}/api/chat/session/assign/${activeSession._id}`, {
        isAssignedToHuman: !isAssigned,
        assignedAgentId: !isAssigned ? agentName : ''
      }, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setActiveSession(res.data.session);
        toast.success(!isAssigned ? `Chat assigned to ${agentName}` : "AI assistant reassigned");
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close or Update Ticket Status
  const handleUpdateTicketStatus = async (status) => {
    if (!activeTicket) return;
    try {
      const res = await axios.post(`${backendUrl}/api/ticket/status/${activeTicket._id}`, { status }, {
        headers: { atoken: aToken }
      });
      if (res.data.success) {
        setActiveTicket(res.data.ticket);
        fetchTickets();
        toast.success(`Ticket marked as ${status}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  // Auto-saving Agent Notes (Debounced)
  const handleNotesChange = (e) => {
    const text = e.target.value;
    setAgentNotes(text);
    setNotesSaving(true);

    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);

    noteDebounceRef.current = setTimeout(async () => {
      try {
        if (activeSession) {
          await axios.post(`${backendUrl}/api/chat/session/assign/${activeSession._id}`, {
            assignedAgentId: activeSession.assignedAgentId
          }, {
            headers: { atoken: aToken }
          });
        } else if (activeTicket) {
          await axios.post(`${backendUrl}/api/ticket/notes/${activeTicket._id}`, {
            agentNotes: text
          }, {
            headers: { atoken: aToken }
          });
          setActiveTicket((prev) => ({ ...prev, agentNotes: text }));
        }
        setNotesSaving(false);
      } catch (err) {
        console.error(err);
        setNotesSaving(false);
      }
    }, 1000);
  };

  // Export raw chat log
  const handleExportChat = () => {
    if (!activeSession) return;
    window.open(`${backendUrl}/api/chat/session/export/${activeSession._id}`);
  };

  // Filtering lists
  const filteredSessions = sessions.filter(s => {
    const name = s.patientId?.name?.toLowerCase() || '';
    const email = s.patientId?.email?.toLowerCase() || '';
    const search = chatSearch.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const filteredTickets = tickets.filter(t => {
    const matchStatus = ticketFilter.status === 'all' || t.status === ticketFilter.status;
    const matchPriority = ticketFilter.priority === 'all' || t.priority === ticketFilter.priority;
    return matchStatus && matchPriority;
  });

  const activeUserCount = sessions.length; // Approximate from sessions active
  const openTicketCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className={`flex flex-col flex-1 h-[calc(100vh-70px)] font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Controller Bar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">Unified Inbox</h2>
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeUserCount} Active Chats
            </span>
            <span className="bg-orange-500/10 text-orange-500 text-xs font-semibold px-2.5 py-1 rounded-full">
              {openTicketCount} Open Tickets
            </span>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            title="Toggle Sound Notifications"
          >
            {soundEnabled ? <Volume2 size={20} className="text-primary" /> : <VolumeX size={20} className="text-gray-400" />}
          </button>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* PANEL 1: Left List Column */}
        <div className={`w-80 flex flex-col border-r h-full ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100 p-2 gap-1">
            <button
              onClick={() => { setActiveTab('chats'); setActiveSession(null); setActiveTicket(null); setActiveEmergency(null); setActiveCallLog(null); }}
              className={`flex-1 py-2 px-0.5 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-0.5 ${
                activeTab === 'chats'
                  ? 'bg-primary text-white shadow-xs'
                  : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <MessageSquare size={11} /> Chats
            </button>
            <button
              onClick={() => { setActiveTab('tickets'); setActiveSession(null); setActiveTicket(null); setActiveEmergency(null); setActiveCallLog(null); }}
              className={`flex-1 py-2 px-0.5 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-0.5 ${
                activeTab === 'tickets'
                  ? 'bg-primary text-white shadow-xs'
                  : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <FileText size={11} /> Tickets
            </button>
            <button
              onClick={() => { setActiveTab('emergencies'); setActiveSession(null); setActiveTicket(null); setActiveEmergency(null); setActiveCallLog(null); }}
              className={`flex-1 py-2 px-0.5 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-0.5 ${
                activeTab === 'emergencies'
                  ? 'bg-red-600 text-white shadow-xs animate-pulse'
                  : darkMode ? 'hover:bg-slate-800 text-red-400' : 'hover:bg-slate-100 text-red-600'
              }`}
            >
              <ShieldAlert size={11} /> Emergency
            </button>
            <button
              onClick={() => { setActiveTab('calls'); setActiveSession(null); setActiveTicket(null); setActiveEmergency(null); setActiveCallLog(null); }}
              className={`flex-1 py-2 px-0.5 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-0.5 ${
                activeTab === 'calls'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : darkMode ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
              }`}
            >
              <Phone size={11} /> Calls
            </button>
          </div>

          {/* Filters Area */}
          <div className="p-3 border-b border-gray-100">
            {activeTab === 'chats' ? (
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search patient name..."
                className={`w-full text-xs rounded-lg px-3 py-2 outline-none border transition ${
                  darkMode ? 'bg-slate-700 border-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 focus:border-primary'
                }`}
              />
            ) : activeTab === 'tickets' ? (
              <div className="flex gap-2">
                <select
                  value={ticketFilter.status}
                  onChange={(e) => setTicketFilter(prev => ({ ...prev, status: e.target.value }))}
                  className={`flex-1 text-[10px] p-1.5 rounded-lg border outline-none bg-transparent ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={ticketFilter.priority}
                  onChange={(e) => setTicketFilter(prev => ({ ...prev, priority: e.target.value }))}
                  className={`flex-1 text-[10px] p-1.5 rounded-lg border outline-none bg-transparent ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            ) : activeTab === 'calls' ? (
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block text-center py-1">Helpline VoIP Call Logs</span>
            ) : (
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block text-center py-1">Active Sirens & Alarms</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Active or Incoming Call widget in Sidebar */}
            {(incomingCall || activeCall) && (
              <div className="mb-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white shadow-md animate-pulse">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold tracking-widest uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                    {incomingCall ? '📞 RINGING...' : '🗣️ CALL ACTIVE'}
                  </span>
                  {activeCall && <span className="font-mono text-[10px] font-bold">{callTimer}s</span>}
                </div>
                <h4 className="font-bold text-xs mt-1">
                  {incomingCall ? incomingCall.patientName : activeCall.patientName}
                </h4>
                <div className="flex gap-2 mt-2.5">
                  {incomingCall ? (
                    <>
                      <button
                        onClick={answerIncomingCall}
                        className="flex-1 bg-white text-emerald-600 font-extrabold py-1 rounded-lg text-[10px] shadow-xs hover:bg-gray-100 transition"
                      >
                        Answer
                      </button>
                      <button
                        onClick={declineIncomingCall}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-white font-bold py-1 rounded-lg text-[10px] transition"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={hangUpActiveCall}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded-lg text-[10px] shadow-xs transition"
                    >
                      Disconnect & Save
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chats' ? (
              filteredSessions.map((s) => (
                <div
                  key={s._id}
                  onClick={() => selectSession(s)}
                  className={`p-3 rounded-xl border cursor-pointer transition relative ${
                    activeSession?._id === s._id
                      ? 'border-primary bg-primary/5'
                      : darkMode ? 'border-slate-700 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-400">SESSION</span>
                    {s.unreadCountAdmin > 0 && (
                      <span className="bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                        {s.unreadCountAdmin}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-xs truncate">{s.patientId?.name || 'Anonymous User'}</h4>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{s.lastMessage || 'No messages yet'}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-medium uppercase ${s.isAssignedToHuman ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                      {s.isAssignedToHuman ? 'Human Agent' : 'Aura AI'}
                    </span>
                  </div>
                </div>
              ))
            ) : activeTab === 'tickets' ? (
              filteredTickets.map((t) => (
                <div
                  key={t._id}
                  onClick={() => selectTicket(t)}
                  className={`p-3 rounded-xl border cursor-pointer transition relative ${
                    activeTicket?._id === t._id
                      ? 'border-primary bg-primary/5'
                      : darkMode ? 'border-slate-700 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-gray-400">{t.ticketId}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                      t.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs truncate">{t.subject}</h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/10 text-[9px] text-gray-400">
                    <span>{t.category}</span>
                    <span className={`font-semibold capitalize ${
                      t.priority === 'urgent' ? 'text-red-500' : t.priority === 'high' ? 'text-orange-500' : 'text-gray-500'
                    }`}>{t.priority}</span>
                  </div>
                </div>
              ))
            ) : activeTab === 'calls' ? (
              callLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs">
                  No completed call logs
                </div>
              ) : (
                callLogs.map((log) => (
                  <div
                    key={log._id}
                    onClick={() => { setActiveCallLog(log); setActiveSession(null); setActiveTicket(null); setActiveEmergency(null); }}
                    className={`p-3 rounded-xl border cursor-pointer transition relative ${
                      activeCallLog?._id === log._id
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : darkMode ? 'border-slate-700 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                        <Phone size={10} /> CALL LOG
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                        log.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'escalated' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs truncate">{log.patientId?.name || 'Anonymous Patient'}</h4>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{log.callNotes}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100/10 text-[9px] text-gray-400">
                      <span>By: {log.executiveName}</span>
                      <span>{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              emergencies.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs">
                  No active emergency alarms
                </div>
              ) : (
                emergencies.map((alert, i) => (
                  <div
                    key={alert._id}
                    onClick={() => { setActiveEmergency(alert); setActiveSession(null); setActiveTicket(null); setActiveCallLog(null); }}
                    className={`p-3 rounded-xl border cursor-pointer transition relative ${
                      activeEmergency?._id === alert._id
                        ? 'border-red-500 bg-red-500/5'
                        : alert.status === 'triggered'
                        ? 'border-red-300 bg-red-50/50 animate-pulse shadow-sm'
                        : darkMode ? 'border-slate-700 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold text-red-600 flex items-center gap-1">
                        <ShieldAlert size={10} /> EMERGENCY #{emergencies.length - i}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                        alert.status === 'triggered' ? 'bg-red-100 text-red-800 animate-pulse' :
                        alert.status === 'dispatched' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs truncate">{alert.patientId?.name || 'Anonymous Patient'}</h4>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{alert.location}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100/10 text-[9px] text-gray-400">
                      <span>{alert.patientId?.phone || 'Emergency GPS'}</span>
                      <span>{alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* PANEL 2: Middle Message Stream Panel */}
        <div className={`flex-1 flex flex-col h-full ${darkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
          {activeSession ? (
            <div className="flex flex-col h-full flex-1">
              {/* Session Header Controls */}
              <div className={`p-4 border-b flex items-center justify-between gap-3 shadow-xs ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white'}`}>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    Chat with {activeSession.patientId?.name} 
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                  </h3>
                  <p className="text-[10px] text-gray-400">Session ID: {activeSession._id}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Handoff toggle */}
                  <button
                    onClick={() => toggleAssign('Support Agent 1')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeSession.isAssignedToHuman
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <UserCheck size={14} /> 
                    {activeSession.isAssignedToHuman ? 'Handoff Assigned' : 'Handoff to Admin'}
                  </button>

                  {/* Toggle AI Button */}
                  <button
                    onClick={toggleAI}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeSession.isAIEnabled
                        ? 'bg-violet-500 text-white hover:bg-violet-600'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <Sparkles size={14} /> 
                    {activeSession.isAIEnabled ? 'AI Active' : 'AI Offline'}
                  </button>

                  {/* Export history */}
                  <button
                    onClick={handleExportChat}
                    className={`p-2 rounded-lg transition border ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}
                    title="Export Chat History"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div ref={chatBodyRef} className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((m, index) => {
                  const isMe = m.senderType === 'admin';
                  return (
                    <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-gray-400 mb-0.5">{m.senderName || m.senderType.toUpperCase()}</span>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs shadow-xs ${
                        isMe
                          ? 'bg-primary text-white rounded-tr-none'
                          : m.senderType === 'ai'
                          ? 'bg-violet-50 text-violet-800 border border-violet-100 rounded-tl-none'
                          : darkMode ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        {m.content && <p className="whitespace-pre-line leading-relaxed">{m.content}</p>}
                        {m.attachment && m.attachmentType === 'image' && (
                          <img src={m.attachment} alt="attachment" className="mt-2 rounded-lg max-h-48 object-cover cursor-pointer" onClick={() => window.open(m.attachment, '_blank')} />
                        )}
                        {m.attachment && m.attachmentType === 'file' && (
                          <a href={m.attachment} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-primary hover:underline font-semibold">
                            <Paperclip size={12} /> Download Attachment
                          </a>
                        )}
                      </div>
                      <span className="text-[8px] text-gray-400 mt-0.5">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                {isTyping && (
                  <p className="text-[10px] text-gray-400 italic">Patient is typing...</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className={`p-4 border-t flex flex-col gap-2 relative ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="text-gray-400 hover:text-primary transition p-2 bg-gray-50 rounded-xl"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleAdminFileUpload(e, 'chat')}
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Type reply to patient..."
                    className={`flex-1 text-xs rounded-xl px-3.5 py-2.5 outline-none border transition ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-primary' : 'bg-slate-50 border-slate-200 focus:border-primary'
                    }`}
                  />
                  <button
                    onClick={handleSendChatMessage}
                    className="bg-primary hover:bg-blue-600 text-white rounded-xl p-2.5 transition shadow-sm"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : activeTicket ? (
            <div className="flex flex-col h-full flex-1">
              {/* Ticket Header Controls */}
              <div className={`p-4 border-b flex items-center justify-between gap-3 shadow-xs ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white'}`}>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    {activeTicket.ticketId}: {activeTicket.subject}
                  </h3>
                  <p className="text-[10px] text-gray-400">Created: {new Date(activeTicket.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={activeTicket.status}
                    onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                    className="text-xs p-1.5 rounded-lg border outline-none bg-transparent"
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Ticket Replies Thread */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Initial Description */}
                <div className="bg-blue-50/15 border border-blue-100/50 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-primary">INITIAL INQUIRY:</p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{activeTicket.description}</p>
                </div>

                {/* Repls */}
                {activeTicket.replies?.map((reply, i) => {
                  const isAgent = reply.senderType === 'admin';
                  return (
                    <div key={i} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-gray-400 mb-0.5">{reply.senderName}</span>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs shadow-xs ${
                        isAgent
                          ? 'bg-primary text-white rounded-tr-none'
                          : darkMode ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-line leading-relaxed">{reply.content}</p>
                        {reply.attachment && (
                          <a href={reply.attachment} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 font-semibold text-primary hover:underline">
                            <Paperclip size={12} /> Download Attachment
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ticket Reply Input */}
              <div className={`p-4 border-t flex flex-col gap-2 ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => replyFileRef.current.click()}
                    className="text-gray-400 hover:text-primary transition p-2 bg-gray-50 rounded-xl"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    type="file"
                    ref={replyFileRef}
                    onChange={(e) => handleAdminFileUpload(e, 'reply')}
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendTicketReply()}
                    placeholder="Type official reply to patient (dispatches email notification)..."
                    className={`flex-1 text-xs rounded-xl px-3.5 py-2.5 outline-none border transition ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-primary' : 'bg-slate-50 border-slate-200 focus:border-primary'
                    }`}
                  />
                  <button
                    onClick={handleSendTicketReply}
                    className="bg-primary hover:bg-blue-600 text-white rounded-xl p-2.5 transition shadow-sm"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : activeEmergency ? (
            <div className="flex flex-col h-full flex-1">
              {/* Emergency Header */}
              <div className={`p-4 border-b flex items-center justify-between gap-3 shadow-xs bg-red-500 text-white`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert size={24} className="text-white animate-pulse" />
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                      🚨 ACTIVE EMERGENCY COMMAND CENTER
                    </h3>
                    <p className="text-[10px] text-red-100 font-mono">Alert ID: {activeEmergency._id}</p>
                  </div>
                </div>
                <div className="bg-white text-red-600 font-bold text-xs px-3 py-1 rounded-full animate-bounce">
                  {activeEmergency.status.toUpperCase()}
                </div>
              </div>

              {/* Emergency Content Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Status Box */}
                <div className={`p-4 rounded-xl border ${
                  activeEmergency.status === 'triggered' ? 'bg-red-50 border-red-200 text-red-800' :
                  activeEmergency.status === 'dispatched' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <h4 className="font-bold text-xs uppercase mb-1">Status Report:</h4>
                  <p className="text-xs">
                    {activeEmergency.status === 'triggered' ? "Patient is waiting for ambulance dispatch. Status: TRIGGERED (Siren active!)" :
                     activeEmergency.status === 'dispatched' ? "Help is on the way! Ambulance dispatched, assigned doctor & nurse notified." :
                     "This emergency alert has been safely resolved."}
                  </p>
                </div>

                {/* Patient Profile */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Patient Name</span>
                    <p className="text-sm font-semibold mt-0.5">{activeEmergency.patientId?.name || 'Anonymous Patient'}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Emergency Contact</span>
                    <p className="text-sm font-semibold mt-0.5">{activeEmergency.patientId?.phone || '999-555-0199'}</p>
                  </div>
                  <div className="col-span-2 p-4 rounded-xl border bg-red-50/10 border-red-100/50">
                    <span className="text-[9px] font-bold text-red-600 uppercase flex items-center gap-1">
                      <MapPin size={10} /> Registered GPS Location
                    </span>
                    <p className="text-xs font-semibold mt-1 text-gray-700">{activeEmergency.location}</p>
                  </div>
                </div>

                {/* Dispatch Controls */}
                {activeEmergency.status !== 'resolved' && (
                  <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600 flex items-center gap-1">
                      🚑 Dispatch Control Panel
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assigned Ambulance ID</label>
                        <input
                          type="text"
                          value={dispatchAmbulance}
                          onChange={(e) => setDispatchAmbulance(e.target.value)}
                          placeholder="e.g. Prescripto-EMS-03"
                          className={`w-full text-xs rounded-lg px-3 py-2 outline-none border transition ${
                            darkMode ? 'bg-slate-700 border-slate-600 focus:border-red-500' : 'bg-slate-50 border-slate-200 focus:border-red-500'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign On-Call Doctor</label>
                          <select
                            value={dispatchDoctor}
                            onChange={(e) => setDispatchDoctor(e.target.value)}
                            className={`w-full text-xs rounded-lg px-3 py-2 outline-none border ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-gray-800'
                            }`}
                          >
                            {doctors.map(d => (
                              <option key={d._id} value={d._id}>
                                Dr. {d.name} ({d.speciality})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign Emergency Nurse</label>
                          <select
                            value={dispatchNurse}
                            onChange={(e) => setDispatchNurse(e.target.value)}
                            className={`w-full text-xs rounded-lg px-3 py-2 outline-none border ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-gray-800'
                            }`}
                          >
                            {nurses.map(n => (
                              <option key={n._id} value={n._id}>
                                {n.name} (Emergency Ward)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={dispatchEmergencyHelp}
                        className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10"
                      >
                        <Truck size={14} /> Dispatch Medical Team
                      </button>
                      
                      <button
                        onClick={resolveEmergency}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                )}

                {activeEmergency.status === 'dispatched' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2 text-xs text-gray-800">
                    <h4 className="font-bold text-emerald-800 flex items-center gap-1">✅ Dispatched Medical Team Summary:</h4>
                    <p>🚑 <strong>Ambulance ID:</strong> {activeEmergency.assignedAmbulance}</p>
                    <p>👨‍⚕️ <strong>Assigned Doctor:</strong> Dr. {activeEmergency.assignedDoctorId?.name} ({activeEmergency.assignedDoctorId?.speciality})</p>
                    <p>🩺 <strong>Assigned Nurse:</strong> {activeEmergency.assignedNurseId?.name || 'Assigned Nurse'}</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeCallLog ? (
            <div className="flex flex-col h-full flex-1">
              {/* Call Log Header */}
              <div className="p-4 border-b flex items-center justify-between gap-3 shadow-xs bg-emerald-600 text-white">
                <div className="flex items-center gap-2">
                  <Phone size={20} className="text-white" />
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                      📞 Helpline Call Log Details
                    </h3>
                    <p className="text-[10px] text-emerald-100 font-mono">Log ID: {activeCallLog._id}</p>
                  </div>
                </div>
                <div className="bg-white text-emerald-600 font-bold text-xs px-3 py-1 rounded-full uppercase">
                  {activeCallLog.status}
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Notes box */}
                <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800">
                  <h4 className="font-bold text-xs uppercase mb-1">Remarks & Logged Symptoms:</h4>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{activeCallLog.callNotes}</p>
                </div>

                {/* Patient Profile */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Patient Name</span>
                    <p className="text-sm font-semibold mt-0.5">{activeCallLog.patientId?.name || 'Anonymous Patient'}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Phone Number</span>
                    <p className="text-sm font-semibold mt-0.5">{activeCallLog.patientId?.phone || '999-555-0199'}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Executive Handler</span>
                    <p className="text-sm font-semibold mt-0.5">{activeCallLog.executiveName}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Call Logged At</span>
                    <p className="text-sm font-semibold mt-0.5">{new Date(activeCallLog.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Escalation Summary */}
                {activeCallLog.isEscalated && activeCallLog.escalatedDoctorId && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2 text-xs text-gray-800">
                    <h4 className="font-bold text-red-800 flex items-center gap-1">⚠️ Urgent Escalation Summary:</h4>
                    <p>👨‍⚕️ <strong>Assigned On-Call Doctor:</strong> Dr. {activeCallLog.escalatedDoctorId?.name} ({activeCallLog.escalatedDoctorId?.speciality})</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <MessageSquare size={50} className="text-primary/20 mb-3 animate-pulse" />
              <h3 className="font-bold text-sm">Welcome to Unified Inbox Console</h3>
              <p className="text-xs text-gray-500 mt-1">Select any live chat session, support ticket or emergency alarm from the sidebar panel to begin.</p>
            </div>
          )}
        </div>

        {/* PANEL 3: Right Context Panel */}
        <div className={`w-80 border-l p-5 flex flex-col h-full overflow-y-auto ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className="text-xs font-bold text-gray-400 tracking-wide uppercase mb-4">Patient Profile Context</h3>
          
          {/* Active context card */}
          {activeSession || activeTicket || activeCallLog ? (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Profile Card */}
              <div className="text-center pb-5 border-b border-gray-100/10">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl font-bold mb-3 shadow-xs">
                  {((activeSession ? activeSession.patientId?.name : (activeTicket ? activeTicket.patientId?.name : activeCallLog.patientId?.name)) || 'P').charAt(0).toUpperCase()}
                </div>
                <h4 className="font-bold text-sm">
                  {activeSession ? activeSession.patientId?.name : (activeTicket ? activeTicket.patientId?.name : activeCallLog.patientId?.name)}
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {activeSession ? activeSession.patientId?.email : (activeTicket ? activeTicket.patientId?.email : activeCallLog.patientId?.email)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {activeSession ? activeSession.patientId?.phone : (activeTicket ? activeTicket.patientId?.phone : activeCallLog.patientId?.phone)}
                </p>
              </div>

              {/* Quick links summary */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Hospital Timeline Details</h4>
                <div className="space-y-2">
                  <div className={`p-2.5 rounded-lg border text-[11px] ${darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'}`}>
                    <strong>Active Admission:</strong>
                    <p className="text-gray-400 mt-0.5">Check Patient Wards section for detailed inpatient status.</p>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-[11px] ${darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'}`}>
                    <strong>Registered Problem:</strong>
                    <p className="text-gray-400 mt-0.5">{activeTicket?.description || activeCallLog?.callNotes || 'General Inquiry'}</p>
                  </div>
                </div>
              </div>

              {/* Private Notes Editor */}
              {!activeCallLog && (
                <div className="flex-1 flex flex-col min-h-[150px]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Private Agent Notes</h4>
                    {notesSaving ? (
                      <span className="text-[9px] text-gray-400 flex items-center gap-1 animate-pulse">
                        <RefreshCw size={10} className="animate-spin" /> Saving...
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-500 font-semibold">Saved</span>
                    )}
                  </div>
                  
                  <textarea
                    value={agentNotes}
                    onChange={handleNotesChange}
                    placeholder="Record private remarks about this patient's status. Saves automatically on stop typing..."
                    className={`w-full flex-1 text-xs border rounded-xl p-3 outline-none resize-none leading-relaxed transition ${
                      darkMode ? 'bg-slate-700/50 border-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 focus:border-primary'
                    }`}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-xs">
              Select a conversation to see context cards and notes editor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedInbox;
