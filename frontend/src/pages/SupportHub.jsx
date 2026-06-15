import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { 
  LifeBuoy, AlertCircle, FileText, Send, Paperclip, ChevronRight, 
  MessageSquare, Clock, ShieldAlert, User, Mail, Phone, PhoneCall, 
  PhoneOff, MapPin, Inbox, CheckCircle, ArrowLeft, Tag, X, Truck
} from 'lucide-react';


const SupportHub = () => {
  const { token, userData, backendUrl } = useContext(AppContext);
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'email' | 'call'
  
  // Form states
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('General');
  const [attachment, setAttachment] = useState('');
  const [attachmentType, setAttachmentType] = useState(null);
  
  // Reply states
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [replyAttachmentType, setReplyAttachmentType] = useState(null);
  
  // Email compose states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailPriority, setEmailPriority] = useState('medium');
  const [emailCategory, setEmailCategory] = useState('General');
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // Call states
  const [callLogs, setCallLogs] = useState([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const callIntervalRef = useRef(null);

  // VoIP call states
  const [isDialing, setIsDialing] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const [callExecutiveName, setCallExecutiveName] = useState('Receptionist Sarah');

  // Emergency states
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fileInputRef = useRef(null);
  const replyFileRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['tickets', 'email', 'call'].includes(tab)) {
      setActiveTab(tab);
      setActiveTicket(null);
      setShowCreateForm(false);
    }
  }, [location]);

  // ---- Ticket Functions ----
  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/ticket/list`, {
        headers: { token }
      });
      if (res.data.success) {
        setTickets(res.data.tickets);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const selectTicket = async (ticket) => {
    setShowCreateForm(false);
    try {
      const res = await axios.get(`${backendUrl}/api/ticket/${ticket._id}`, {
        headers: { token }
      });
      if (res.data.success) {
        setActiveTicket(res.data.ticket);
      } else {
        setActiveTicket(ticket);
      }
    } catch (err) {
      console.error(err);
      setActiveTicket(ticket);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token, backendUrl]);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket]);

  // ---- Call Functions ----
  const fetchCallLogs = async () => {
    if (!token) return;
    setCallLogsLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/support-channel/call/list`, {
        headers: { token }
      });
      if (res.data.success) {
        setCallLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCallLogsLoading(false);
    }
  };

  const fetchEmergencies = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${backendUrl}/api/support-channel/emergency/list`, {
        headers: { token }
      });
      if (res.data.success) {
        setEmergencyAlerts(res.data.alerts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'call') {
      fetchCallLogs();
      fetchEmergencies();
    }
  }, [activeTab, token]);

  // VoIP call and emergency alert bridging sync
  useEffect(() => {
    const handleCallConnected = (e) => {
      const { executiveName } = e.detail;
      console.log("SupportHub: Call Connected event caught", executiveName);
      setIsDialing(false);
      setCallConnected(true);
      setCallActive(true);
      setCallExecutiveName(executiveName || 'Receptionist Sarah');
      setCallModalOpen(true);
    };

    const handleCallEnded = () => {
      console.log("SupportHub: Call Ended event caught");
      setCallActive(false);
      setCallConnected(false);
      setIsDialing(false);
      setCallModalOpen(false);
      fetchCallLogs();
    };

    const handleEmergencyDispatched = () => {
      console.log("SupportHub: Emergency Dispatched event caught");
      fetchEmergencies();
    };

    window.addEventListener('patient-voip-call-connected', handleCallConnected);
    window.addEventListener('patient-voip-call-ended', handleCallEnded);
    window.addEventListener('patient-emergency-dispatched', handleEmergencyDispatched);

    return () => {
      window.removeEventListener('patient-voip-call-connected', handleCallConnected);
      window.removeEventListener('patient-voip-call-ended', handleCallEnded);
      window.removeEventListener('patient-emergency-dispatched', handleEmergencyDispatched);
    };
  }, []);

  // Call timer
  useEffect(() => {
    if (callConnected) {
      callIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallTimer(0);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [callConnected]);

  const formatCallTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // VoIP call triggers
  const startCall = () => {
    console.log("Triggering startCall from SupportHub.jsx");
    setCallModalOpen(true);
    setIsDialing(true);
    setCallConnected(false);
    setCallActive(false);
    setCallTimer(0);
    
    // Notify ChatAssistant to emit patientCallInit and play dial tone
    window.dispatchEvent(new CustomEvent('patient-voip-call-init'));
  };

  const endCall = () => {
    console.log("Triggering hangup from SupportHub.jsx");
    // Notify ChatAssistant to terminate the socket connection and signal admin
    window.dispatchEvent(new CustomEvent('patient-voip-call-hangup'));
    
    setCallActive(false);
    setCallConnected(false);
    setIsDialing(false);
    setCallModalOpen(false);
    
    setTimeout(() => {
      fetchCallLogs();
    }, 1500);
  };

  // ---- File Upload ----
  const handleFileUpload = async (e, mode) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info("Uploading file...");
      const res = await axios.post(`${backendUrl}/api/chat/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success("File uploaded!");
        if (mode === 'ticket') {
          setAttachment(res.data.url);
          setAttachmentType(res.data.type);
        } else {
          setReplyAttachment(res.data.url);
          setReplyAttachmentType(res.data.type);
        }
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("File upload failed");
    }
  };

  // ---- Ticket Create ----
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.warning("Please fill in subject and description");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${backendUrl}/api/ticket/create`, {
        subject,
        description,
        priority,
        category,
        attachment,
        attachmentType,
        userId: userData._id
      }, {
        headers: { token }
      });

      if (res.data.success) {
        toast.success("Support ticket created! Email notification sent.");
        setShowCreateForm(false);
        setSubject('');
        setDescription('');
        setAttachment('');
        setAttachmentType(null);
        fetchTickets();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Send Email Support (creates ticket with email notification) ----
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.warning("Please fill in subject and message body");
      return;
    }
    setEmailSending(true);
    try {
      const res = await axios.post(`${backendUrl}/api/ticket/create`, {
        subject: `[Email] ${emailSubject}`,
        description: emailBody,
        priority: emailPriority,
        category: emailCategory,
        userId: userData._id
      }, {
        headers: { token }
      });

      if (res.data.success) {
        toast.success("Email support request sent! You'll receive a confirmation email shortly.");
        setShowEmailCompose(false);
        setEmailSubject('');
        setEmailBody('');
        setEmailPriority('medium');
        fetchTickets();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send email");
    } finally {
      setEmailSending(false);
    }
  };

  // ---- Send Reply ----
  const handleSendReply = async () => {
    if (!replyText.trim() && !replyAttachment) return;
    if (!activeTicket) return;

    try {
      const res = await axios.post(`${backendUrl}/api/ticket/reply/${activeTicket._id}`, {
        content: replyText,
        attachment: replyAttachment,
        senderType: 'user',
        senderName: userData.name,
        senderId: userData._id
      }, {
        headers: { token }
      });

      if (res.data.success) {
        setActiveTicket(res.data.ticket);
        setReplyText('');
        setReplyAttachment('');
        setReplyAttachmentType(null);
        fetchTickets();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    }
  };

  // ---- Helpers ----
  const getPriorityColor = (prio) => {
    switch (prio) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'resolved': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <LifeBuoy size={50} className="text-primary mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Support Hub</h2>
        <p className="text-gray-500 mt-2 max-w-md">Access Prescripto's communication system for live chat, email support, and phone call support. Please log in first.</p>
      </div>
    );
  }

  // ---- Email Support Tab ----
  const renderEmailTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Email List / Compose */}
      <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-8">
        {showEmailCompose ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Mail size={20} className="text-indigo-500" /> Compose Email
              </h3>
              <button onClick={() => setShowEmailCompose(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">TO</label>
                <input
                  type="text"
                  value="support@prescripto.com"
                  disabled
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">SUBJECT</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 transition"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">CATEGORY</label>
                  <select
                    value={emailCategory}
                    onChange={(e) => setEmailCategory(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Appointment">Appointment</option>
                    <option value="Billing">Billing</option>
                    <option value="Medical Inquiry">Medical Inquiry</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">PRIORITY</label>
                  <select
                    value={emailPriority}
                    onChange={(e) => setEmailPriority(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">MESSAGE</label>
                <textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Describe your issue in detail. Include appointment IDs, doctor names, or billing references if applicable."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 transition resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={emailSending}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Inbox size={20} className="text-indigo-500" /> Email Inbox
              </h3>
              <button
                onClick={() => setShowEmailCompose(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-sm hover:shadow-md transition"
              >
                + Compose
              </button>
            </div>
            {/* Show email tickets (ones with [Email] prefix) */}
            {tickets.filter(t => t.subject.startsWith('[Email]')).length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Mail size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No email support conversations yet.</p>
                <p className="text-xs mt-1">Click "Compose" to send your first email to our support team.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                {tickets.filter(t => t.subject.startsWith('[Email]')).map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => { selectTicket(ticket); }}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      activeTicket?._id === ticket._id
                        ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">{ticket.ticketId}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-800 truncate">{ticket.subject.replace('[Email] ', '')}</h4>
                    <p className="text-xs text-gray-500 truncate mt-1">{ticket.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={10} /> {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}</span>
                      <span className={`border px-2 py-0.5 rounded-md font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                        <MessageSquare size={10} /> {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Email Thread */}
      <div className="lg:col-span-2 flex flex-col min-h-[50vh] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {activeTicket && activeTicket.subject.startsWith('[Email]') ? (
          renderTicketThread()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <Mail size={48} className="text-indigo-200 mb-3" />
            <p className="text-sm font-semibold">No Email Selected</p>
            <p className="text-xs mt-1">Select an email conversation or compose a new one to contact our support team.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Call Support Tab ----
  const renderCallTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Call Support Panel */}
      <div className="space-y-6">
        {/* Call Now Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Call Support</h3>
                <p className="text-emerald-100 text-xs">Speak directly with our receptionist</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} /> <span className="font-mono font-bold">+91 999-555-0199</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-100">
                <Clock size={12} /> Available: Mon-Sat, 8:00 AM - 10:00 PM IST
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-100">
                <User size={12} /> Receptionist: Sarah / Priya (Prescripto Helpdesk)
              </div>
            </div>
            <button
              onClick={startCall}
              className="w-full bg-white text-emerald-600 font-bold py-3 rounded-xl hover:bg-emerald-50 transition shadow-md flex items-center justify-center gap-2"
            >
              <PhoneCall size={18} /> Start Call
            </button>
          </div>
        </div>

        {/* Emergency Hotline Card */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="font-bold">Emergency Hotline</h4>
                <p className="text-red-100 text-[10px]">For life-threatening emergencies only</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-xs space-y-1 mb-3">
              <p>🚑 Ambulance dispatch within 10 minutes</p>
              <p>👨‍⚕️ Emergency doctor assigned immediately</p>
              <p>📍 GPS location auto-shared with EMS team</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await axios.post(`${backendUrl}/api/support-channel/emergency/trigger`, {
                    location: "Patient Web Interface (Browser GPS)"
                  }, { headers: { token } });
                  if (res.data.success) {
                    toast.success("🚨 Emergency alert sent! Help is on the way.");
                    fetchEmergencies();
                    
                    // Dispatch custom event to notify ChatAssistant so it emits WebSocket and plays sound
                    window.dispatchEvent(new CustomEvent('patient-emergency-triggered', { detail: res.data.alert }));
                  }
                } catch (err) {
                  toast.error("Emergency trigger failed. Call 112 directly.");
                }
              }}
              className="w-full bg-white text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-50 transition shadow-md text-sm flex items-center justify-center gap-2 animate-pulse"
            >
              <ShieldAlert size={16} /> Trigger Emergency Alert
            </button>
          </div>
        </div>
      </div>

      {/* Right: Call History & Emergency Logs */}
      <div className="space-y-6">
        {/* Call History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <PhoneCall size={20} className="text-emerald-500" /> Call History
          </h3>
          {callLogsLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading call logs...</div>
          ) : callLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Phone size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No call history yet</p>
              <p className="text-xs mt-1">Your support call records will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[30vh] overflow-y-auto">
              {callLogs.map((log, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-xs transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <PhoneCall size={12} /> {log.executiveName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      log.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                      log.status === 'escalated' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{log.callNotes}</p>
                  {log.isEscalated && log.escalatedDoctorId && (
                    <p className="text-[10px] text-orange-600 mt-1 font-medium">
                      Escalated to: Dr. {log.escalatedDoctorId.name} ({log.escalatedDoctorId.speciality})
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={10} /> {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Alert History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <ShieldAlert size={20} className="text-red-500" /> Emergency Alerts
          </h3>
          {emergencyAlerts.length === 0 ? (
            <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm">No emergency alerts</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[25vh] overflow-y-auto">
              {emergencyAlerts.map((alert, i) => (
                <div key={i} className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <ShieldAlert size={12} /> Emergency #{i + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      alert.status === 'triggered' ? 'bg-red-100 text-red-700 animate-pulse' :
                      alert.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {alert.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 mt-2.5 bg-white/70 p-2.5 rounded-lg border border-red-100/50">
                    <p className="flex items-center gap-1.5"><MapPin size={12} className="text-red-500" /> <strong>Location:</strong> {alert.location}</p>
                    <p className="flex items-center gap-1.5"><Truck size={12} className="text-red-500 animate-bounce" /> <strong>Ambulance:</strong> {alert.assignedAmbulance || 'Dispatch Pending'}</p>
                    <p className="flex items-center gap-1.5"><User size={12} className="text-red-500" /> <strong>Doctor:</strong> {alert.assignedDoctorId?.name ? `Dr. ${alert.assignedDoctorId.name} (${alert.assignedDoctorId.speciality || ''})` : 'Assigning doctor...'}</p>
                    {alert.assignedNurseId && (
                      <p className="flex items-center gap-1.5"><User size={12} className="text-red-500" /> <strong>Nurse:</strong> {alert.assignedNurseId?.name ? `Nurse ${alert.assignedNurseId.name}` : 'Assigning nurse...'}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={10} /> {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Call Modal Overlay */}
      {callModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-5 animate-in">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
              callConnected ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-primary/10 text-primary animate-bounce'
            }`}>
              {callConnected ? <PhoneCall size={36} /> : <Phone size={36} />}
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-gray-800">Prescripto Helpline</h4>
              {callConnected ? (
                <p className="text-xs text-gray-400 mt-0.5">Connected: {callExecutiveName}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Calling Prescripto Helpdesk...</p>
              )}
              <p className="text-xs text-gray-400 font-mono">+91 999-555-0199</p>
            </div>

            {callConnected ? (
              <div className="space-y-4">
                <div className="text-3xl font-mono text-emerald-600 font-bold">
                  {formatCallTime(callTimer)}
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium">Call in progress</span>
                </div>
                <p className="text-[11px] text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 italic">
                  "{callExecutiveName} is active. Your call notes will be saved automatically in your history."
                </p>
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-2xl transition shadow-lg flex items-center gap-2 mx-auto"
                >
                  <PhoneOff size={18} /> End Call
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-primary animate-pulse">
                  Ringing...
                </div>
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-2xl transition shadow-lg flex items-center gap-2 mx-auto"
                >
                  <PhoneOff size={18} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ---- Shared Ticket Thread Component ----
  const renderTicketThread = () => {
    if (!activeTicket) return null;
    return (
      <div className="flex flex-col h-full flex-1">
        {/* Active Ticket Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <button 
                onClick={() => setActiveTicket(null)} 
                className="text-gray-400 hover:text-primary transition lg:hidden"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-xs font-bold text-primary">{activeTicket.ticketId}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(activeTicket.status)}`}>
                {activeTicket.status}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getPriorityColor(activeTicket.priority)}`}>
                {activeTicket.priority}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">{activeTicket.subject}</h2>
          </div>
          <div className="text-[11px] text-gray-400 text-left sm:text-right">
            <p>Category: <strong className="text-gray-600">{activeTicket.category}</strong></p>
            <p className="flex items-center gap-1 mt-0.5 justify-start sm:justify-end">
              <Clock size={12} /> {activeTicket.createdAt ? new Date(activeTicket.createdAt).toLocaleDateString() : ''}
            </p>
          </div>
        </div>

        {/* Thread Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[50vh] bg-[#fdfefe]">
          {/* Initial Description Card */}
          <div className="bg-blue-50/20 border border-blue-100/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <User size={14} className="text-primary" /> {userData?.name || 'Patient'} (Creator)
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{activeTicket.description}</p>
          </div>

          {/* Replies Thread */}
          {activeTicket.replies && activeTicket.replies.length > 0 ? (
            activeTicket.replies.map((reply, i) => {
              const isAgent = reply.senderType === 'admin';
              return (
                <div key={i} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-gray-500">{reply.senderName}</span>
                    {isAgent && <span className="text-[8px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full uppercase">Staff</span>}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                      isAgent
                        ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                        : 'bg-primary text-white rounded-tr-none'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                    {reply.attachment && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <a
                          href={reply.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1.5 text-xs p-1.5 rounded-lg ${isAgent ? 'bg-gray-50 text-primary border' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          <Paperclip size={12} /> View File
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                    {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-gray-400">
              <MessageSquare size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-xs">No replies yet. Our support team will respond shortly.</p>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Reply Input Box */}
        {activeTicket.status === 'closed' ? (
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <ShieldAlert size={14} /> This ticket is closed. If you still need help, please submit a new ticket.
          </div>
        ) : (
          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder="Type a reply..."
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary focus:bg-white transition"
              />
              
              <button
                onClick={() => replyFileRef.current.click()}
                className="text-gray-400 hover:text-primary transition p-2 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                <Paperclip size={18} />
              </button>
              <input
                type="file"
                ref={replyFileRef}
                onChange={(e) => handleFileUpload(e, 'reply')}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx"
              />

              <button
                onClick={handleSendReply}
                className="bg-primary hover:bg-blue-600 text-white rounded-xl p-2.5 transition shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
            {replyAttachment && (
              <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit font-medium">
                Attachment uploaded successfully!
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---- Tickets Tab (original) ----
  const renderTicketsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Side: Creation Form or Tickets List */}
      <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-8">
        {showCreateForm ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-primary" /> New Support Ticket
            </h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">SUBJECT</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">CATEGORY</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary bg-white transition"
                  >
                    <option value="General">General Support</option>
                    <option value="Appointment">Appointment Help</option>
                    <option value="Billing">Billing issue</option>
                    <option value="Medical Inquiry">Medical Query</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">PRIORITY</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary bg-white transition"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">DESCRIPTION</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide full details of your inquiry, symptoms, or billing issues"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary transition resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ATTACHMENT (OPTIONAL)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="flex items-center gap-2 border border-gray-200 hover:border-primary hover:text-primary transition rounded-xl px-4 py-2.5 text-xs text-gray-600 font-semibold"
                  >
                    <Paperclip size={14} /> Attach File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e, 'ticket')}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx"
                  />
                  {attachment && (
                    <span className="text-[10px] text-emerald-600 font-medium truncate max-w-[150px] bg-emerald-50 px-2 py-1 rounded">
                      {attachmentType === 'image' ? 'Image uploaded' : 'Document attached'}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition shadow-md disabled:bg-gray-300"
              >
                {submitting ? 'Creating...' : 'Submit Support Ticket'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-primary" /> My Tickets ({tickets.filter(t => !t.subject.startsWith('[Email]')).length})
              </h3>
              <button
                onClick={() => { setShowCreateForm(true); setActiveTicket(null); }}
                className="bg-primary text-white text-xs font-medium px-4 py-2 rounded-full shadow-sm hover:shadow-md transition"
              >
                + New
              </button>
            </div>
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading tickets...</div>
            ) : tickets.filter(t => !t.subject.startsWith('[Email]')).length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                You have not submitted any support tickets yet.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                {tickets.filter(t => !t.subject.startsWith('[Email]')).map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => { selectTicket(ticket); setShowCreateForm(false); }}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      activeTicket?._id === ticket._id
                        ? 'border-primary bg-blue-50/50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">{ticket.ticketId}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-800 truncate">{ticket.subject}</h4>
                    <p className="text-xs text-gray-500 truncate mt-1">{ticket.description}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                      <span className="capitalize">{ticket.category}</span>
                      <span className={`border px-2 py-0.5 rounded-md font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-primary font-medium">
                        <MessageSquare size={10} /> {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side: Conversation Thread Details */}
      <div className="lg:col-span-2 flex flex-col min-h-[50vh] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {activeTicket && !activeTicket.subject.startsWith('[Email]') ? (
          renderTicketThread()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <MessageSquare size={48} className="text-primary/20 mb-3" />
            <p className="text-sm font-semibold">No Ticket Selected</p>
            <p className="text-xs mt-1">Select a ticket from the left panel to review notes, agent updates, and replies.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl font-sans min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Support Hub</h1>
          <p className="text-gray-500 mt-1">Choose your preferred support channel: Tickets, Email, or Phone Call.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 mb-8 max-w-fit">
        <button
          onClick={() => { setActiveTab('tickets'); setActiveTicket(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'tickets'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} /> Tickets
        </button>
        <button
          onClick={() => { setActiveTab('email'); setActiveTicket(null); setShowCreateForm(false); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'email'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail size={16} /> Email Support
        </button>
        <button
          onClick={() => { setActiveTab('call'); setActiveTicket(null); setShowCreateForm(false); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'call'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Phone size={16} /> Call Support
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tickets' && renderTicketsTab()}
      {activeTab === 'email' && renderEmailTab()}
      {activeTab === 'call' && renderCallTab()}
    </div>
  );
};

export default SupportHub;
