import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, X, Send, Paperclip, Smile, Sparkles, User, 
  RefreshCw, AlertCircle, Phone, ShieldAlert, Truck, HeartPulse, Activity,
  Mail, PhoneCall, PhoneOff
} from 'lucide-react';
import { AppContext } from '../context/AppContext';

// Synthesise audio alerts and ringtones without using local files
let activeAudioContext = null;
let activePatientDialtoneInterval = null;

const stopAllSounds = () => {
  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch (e) {
      console.warn("Failed to close active audio context:", e);
    }
    activeAudioContext = null;
  }
};

const playSoundEffect = (type = 'incoming') => {
  try {
    stopAllSounds();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    activeAudioContext = audioCtx;
    
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
      // Emergency wailing siren
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      
      // Frequency modulation
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.8);
      osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 1.2);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } else if (type === 'incoming') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else {
      // Outgoing sweep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(554.37, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }
  } catch (e) {
    console.warn("Audio blocked by browser context restrictions", e);
  }
};

const ChatAssistant = () => {
  const { token, userData, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState('offline');

  // Support channel states
  const [callModal, setCallModal] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState(null);

  // VoIP call states
  const [isDialing, setIsDialing] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const [adminSocketId, setAdminSocketId] = useState(null);
  const [callExecutiveName, setCallExecutiveName] = useState('Receptionist Sarah');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const callIntervalRef = useRef(null);
  const dialIntervalRef = useRef(null);

  const stopDialtone = () => {
    if (activePatientDialtoneInterval) {
      clearInterval(activePatientDialtoneInterval);
      activePatientDialtoneInterval = null;
    }
    if (dialIntervalRef.current) {
      clearInterval(dialIntervalRef.current);
      dialIntervalRef.current = null;
    }
    stopAllSounds();
  };

  const startDialtone = () => {
    stopDialtone();
    playSoundEffect('ringtone');
    const interval = setInterval(() => {
      playSoundEffect('ringtone');
    }, 3000);
    activePatientDialtoneInterval = interval;
    dialIntervalRef.current = interval;
  };
  const emojis = ['😊', '❤️', '👍', '🙏', '🙋', '😷', '🏥', '💊', '⭐', '🩺'];

  // Initialize socket & session once user logs in
  useEffect(() => {
    if (!token || !userData) {
      setSession(null);
      setMessages([]);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const initChat = async () => {
      try {
        // 1. Establish Socket Connection immediately for calling & emergency alerts
        if (!socketRef.current) {
          const socket = io(backendUrl);
          socketRef.current = socket;

          socket.on('connect', () => {
            console.log("Patient socket connected:", socket.id);
            socket.emit('registerOnline', { userId: userData._id, userType: 'user' });
            socket.emit('joinRoom', { userId: userData._id });
          });
          // VoIP call socket event listeners
          socket.on('callConnected', ({ executiveName, adminSocketId }) => {
            console.log("VoIP Call Connected to admin:", executiveName);
            stopDialtone();
            setIsDialing(false);
            setCallConnected(true);
            setCallActive(true);
            setAdminSocketId(adminSocketId);
            setCallExecutiveName(executiveName || 'Receptionist Sarah');
            
            // Dispatch event to SupportHub so it syncs
            window.dispatchEvent(new CustomEvent('patient-voip-call-connected', { 
              detail: { executiveName: executiveName || 'Receptionist Sarah', adminSocketId } 
            }));
          });

          socket.on('callEnded', () => {
            console.log("VoIP Call Ended by peer");
            stopDialtone();
            setCallActive(false);
            setCallConnected(false);
            setIsDialing(false);
            setCallModal(false);
            setAdminSocketId(null);
            
            // Dispatch event to SupportHub so it syncs
            window.dispatchEvent(new CustomEvent('patient-voip-call-ended'));
          });
          // Listen for emergency updates dispatched from admin
          socket.on('emergencyDispatched', (alert) => {
            console.log("Emergency dispatched update received:", alert);
            setEmergencyDetails(alert);
            setEmergencyActive(true);
            playSoundEffect('siren');
            
            // Dispatch event to SupportHub so it syncs
            window.dispatchEvent(new CustomEvent('patient-emergency-dispatched', { detail: alert }));
          });
        }

        // 2. Load/Create Chat Session
        const res = await axios.post(`${backendUrl}/api/chat/session`, {
          patientId: userData._id
        }, {
          headers: { token }
        });

        if (res.data.success) {
          const activeSession = res.data.session;
          setSession(activeSession);

          // Get initial messages
          const msgRes = await axios.get(`${backendUrl}/api/chat/messages`, {
            params: { sessionId: activeSession._id },
            headers: { token }
          });
          if (msgRes.data.success) {
            setMessages(msgRes.data.messages);
          }

          // Setup suggested replies based on last message
          if (activeSession.isAssignedToHuman) {
            setSuggestedReplies(["📧 Email Support", "📞 Call Support"]);
          } else {
            setSuggestedReplies(["📅 Book Appointment", "🛏️ Check Admissions", "🙋 Speak to Agent", "📧 Email Support", "📞 Call Support"]);
          }

          // Clear any unread counts
          await axios.post(`${backendUrl}/api/chat/session/read/${activeSession._id}`, { userType: 'user' }, {
            headers: { token }
          });

          // Join session room
          if (socketRef.current) {
            socketRef.current.emit('joinSession', { sessionId: activeSession._id });
            socketRef.current.emit('markRead', { sessionId: activeSession._id, userType: 'user' });
          }

          // Listen for new messages
          socketRef.current.off('newMessage'); // prevent duplicate listener
          socketRef.current.on('newMessage', (msg) => {
            if (msg.senderId !== userData._id) {
              setMessages((prev) => [...prev, msg]);
              setIsAITyping(false);
              setIsAgentTyping(false);
              playSoundEffect('incoming');

              if (msg.senderType === 'ai') {
                if (msg.content.includes("transferring you")) {
                  setSuggestedReplies(["📧 Email Support", "📞 Call Support"]);
                } else {
                  setSuggestedReplies(["📅 Book Appointment", "🛏️ Check Admissions", "🙋 Speak to Agent", "📧 Email Support", "📞 Call Support"]);
                }
              }

              axios.post(`${backendUrl}/api/chat/session/read/${activeSession._id}`, { userType: 'user' }, {
                headers: { token }
              });
              if (socketRef.current) {
                socketRef.current.emit('markRead', { sessionId: activeSession._id, userType: 'user' });
              }
            }
          });

          // Listen for emergency updates
          socketRef.current.off('emergencyTriggered');
          socketRef.current.on('emergencyTriggered', (alert) => {
            if (alert.patientId === userData._id) {
              setEmergencyDetails(alert);
            }
          });

          // Typing indicators
          socketRef.current.off('typing');
          socketRef.current.on('typing', ({ senderType }) => {
            if (senderType === 'ai') {
              setIsAITyping(true);
            } else if (senderType === 'admin' || senderType === 'doctor') {
              setIsAgentTyping(true);
            }
          });

          socketRef.current.off('stopTyping');
          socketRef.current.on('stopTyping', ({ senderType }) => {
            if (senderType === 'ai') {
              setIsAITyping(false);
            } else if (senderType === 'admin' || senderType === 'doctor') {
              setIsAgentTyping(false);
            }
          });

          socketRef.current.off('sessionRead');
          socketRef.current.on('sessionRead', ({ userType }) => {
            if (userType === 'admin') {
              setMessages((prev) =>
                prev.map((m) => (m.senderType === 'user' ? { ...m, status: 'read' } : m))
              );
            }
          });

          socketRef.current.off('statusUpdate');
          socketRef.current.on('statusUpdate', ({ userId, status }) => {
            if (userId === userData._id) {
              setOnlineStatus(status);
            }
          });
        }
      } catch (err) {
        console.error("Chat init error:", err);
      }
    };

    initChat();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [token, userData, backendUrl]);

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAITyping, isAgentTyping]);

  // Call timer interval
  useEffect(() => {
    if (callConnected) {
      callIntervalRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallTimer(0);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [callConnected]);



  // Listen to custom events from SupportHub tab
  useEffect(() => {
    const handleHubStartCall = () => {
      console.log("Custom event: patient-voip-call-init caught");
      startCall();
    };
    const handleHubEndCall = () => {
      console.log("Custom event: patient-voip-call-hangup caught");
      endCall();
    };
    const handleHubEmergency = (e) => {
      const alert = e.detail;
      console.log("Custom event: patient-emergency-triggered caught", alert);
      setEmergencyDetails(alert);
      setEmergencyActive(true);
      playSoundEffect('siren');
      
      const socket = ensureSocketConnected();
      if (socket) {
        socket.emit('emergencyAlert', {
          alertId: alert._id,
          patientName: userData?.name || 'Patient',
          patientPhone: userData?.phone || '999-555-0199',
          location: alert.location
        });
      }
    };

    window.addEventListener('patient-voip-call-init', handleHubStartCall);
    window.addEventListener('patient-voip-call-hangup', handleHubEndCall);
    window.addEventListener('patient-emergency-triggered', handleHubEmergency);

    return () => {
      window.removeEventListener('patient-voip-call-init', handleHubStartCall);
      window.removeEventListener('patient-voip-call-hangup', handleHubEndCall);
      window.removeEventListener('patient-emergency-triggered', handleHubEmergency);
    };
  }, [token, userData, socketRef.current, adminSocketId]);

  // Format call timer
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Send textual message
  const handleSendMessage = async (msgText = inputMessage) => {
    if (!msgText.trim() || !session) return;

    const textToSend = msgText;
    setInputMessage('');
    setShowEmoji(false);
    playSoundEffect('outgoing');

    const tempMsg = {
      sessionId: session._id,
      senderId: userData._id,
      senderType: 'user',
      senderName: userData.name,
      content: textToSend,
      createdAt: new Date(),
      status: 'sent'
    };

    setMessages((prev) => [...prev, tempMsg]);

    if (socketRef.current) {
      socketRef.current.emit('stopTyping', { sessionId: session._id, senderType: 'user' });
    }

    if (session.isAIEnabled && !session.isAssignedToHuman) {
      setIsAITyping(true);
    }

    try {
      const res = await axios.post(`${backendUrl}/api/chat/message`, {
        sessionId: session._id,
        senderId: userData._id,
        senderType: 'user',
        senderName: userData.name,
        content: textToSend
      }, {
        headers: { token }
      });

      if (res.data.success) {
        if (socketRef.current) {
          socketRef.current.emit('sendMessage', res.data.message);
        }

        if (res.data.aiReply) {
          setMessages((prev) => [...prev, res.data.aiReply]);
          setIsAITyping(false);
          playSoundEffect('incoming');

          if (res.data.aiReply.content.includes("transferring you")) {
            setSession((prev) => ({ ...prev, isAssignedToHuman: true }));
            setSuggestedReplies([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsAITyping(false);
    }
  };

  // Upload file/image
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !session) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${backendUrl}/api/chat/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          token 
        }
      });

      if (res.data.success) {
        const fileMsg = {
          sessionId: session._id,
          senderId: userData._id,
          senderType: 'user',
          senderName: userData.name,
          content: `Sent ${res.data.type === 'image' ? 'an image' : 'a file'}`,
          attachment: res.data.url,
          attachmentType: res.data.type,
          createdAt: new Date(),
          status: 'sent'
        };

        setMessages((prev) => [...prev, fileMsg]);
        playSoundEffect('outgoing');

        const saveRes = await axios.post(`${backendUrl}/api/chat/message`, {
          sessionId: session._id,
          senderId: userData._id,
          senderType: 'user',
          senderName: userData.name,
          content: fileMsg.content,
          attachment: res.data.url,
          attachmentType: res.data.type
        }, {
          headers: { token }
        });

        if (saveRes.data.success) {
          if (socketRef.current) {
            socketRef.current.emit('sendMessage', saveRes.data.message);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Trigger Emergency Hotline Action
  const triggerEmergency = async () => {
    if (!token) return;
    playSoundEffect('siren');
    setEmergencyActive(true);

    try {
      const res = await axios.post(`${backendUrl}/api/support-channel/emergency/trigger`, {
        location: "Patient Web Interface (Browser GPS)"
      }, {
        headers: { token }
      });

      if (res.data.success) {
        setEmergencyDetails(res.data.alert);
        
        // Emit Socket to notify active admin UnifiedInbox console
        if (socketRef.current) {
          socketRef.current.emit('emergencyAlert', {
            alertId: res.data.alert._id,
            patientName: userData.name,
            patientPhone: userData.phone || '999-555-0199',
            location: res.data.alert.location
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to ensure socket is initialized and connected on demand
  const ensureSocketConnected = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log("Socket is null or disconnected. Connecting on-demand...");
      const socketInstance = io(backendUrl);
      socketRef.current = socketInstance;

      socketInstance.on('connect', () => {
        console.log("Patient socket connected on-demand:", socketInstance.id);
        socketInstance.emit('registerOnline', { userId: userData._id, userType: 'user' });
        socketInstance.emit('joinRoom', { userId: userData._id });
        if (session) {
          socketInstance.emit('joinSession', { sessionId: session._id });
        }
      });
      socketInstance.on('callConnected', ({ executiveName, adminSocketId }) => {
        console.log("VoIP Call Connected to admin:", executiveName);
        stopDialtone();
        setIsDialing(false);
        setCallConnected(true);
        setCallActive(true);
        setAdminSocketId(adminSocketId);
        setCallExecutiveName(executiveName || 'Receptionist Sarah');
        
        window.dispatchEvent(new CustomEvent('patient-voip-call-connected', { 
          detail: { executiveName: executiveName || 'Receptionist Sarah', adminSocketId } 
        }));
      });

      socketInstance.on('callEnded', () => {
        console.log("VoIP Call Ended by peer");
        stopDialtone();
        setCallActive(false);
        setCallConnected(false);
        setIsDialing(false);
        setCallModal(false);
        setAdminSocketId(null);
        
        window.dispatchEvent(new CustomEvent('patient-voip-call-ended'));
      });
      socketInstance.on('emergencyDispatched', (alert) => {
        console.log("Emergency dispatched update received:", alert);
        setEmergencyDetails(alert);
        setEmergencyActive(true);
        playSoundEffect('siren');
        
        window.dispatchEvent(new CustomEvent('patient-emergency-dispatched', { detail: alert }));
      });
      
      socketInstance.on('emergencyTriggered', (alert) => {
        if (alert.patientId === userData._id) {
          setEmergencyDetails(alert);
        }
      });

      socketInstance.on('statusUpdate', ({ userId, status }) => {
        if (userId === userData._id) {
          setOnlineStatus(status);
        }
      });
    }
    return socketRef.current;
  };

  // Start Helpline VoIP call
  const startCall = () => {
    setIsDialing(true);
    setCallConnected(false);
    setCallActive(false);
    setCallModal(true);
    setCallTimer(0);
    startDialtone();
    
    const socket = ensureSocketConnected();
    if (socket) {
      console.log("Emitting patientCallInit");
      socket.emit('patientCallInit', {
        patientId: userData._id,
        patientName: userData.name,
        patientPhone: userData.phone || '999-555-0199'
      });
    }
  };

  const endCall = () => {
    console.log("Hanging up VoIP call. adminSocketId:", adminSocketId);
    stopDialtone();
    if (socketRef.current) {
      if (adminSocketId) {
        socketRef.current.emit('callDisconnected', { targetSocketId: adminSocketId });
      } else {
        socketRef.current.emit('callDisconnected', { targetSocketId: 'admin_inbox' });
      }
    }
    setCallActive(false);
    setCallConnected(false);
    setIsDialing(false);
    setCallModal(false);
    setAdminSocketId(null);
    window.dispatchEvent(new CustomEvent('patient-voip-call-ended'));
  };

  const triggerHandoff = async () => {
    if (!session) return;
    try {
      const res = await axios.post(`${backendUrl}/api/chat/session/assign/${session._id}`, {
        isAssignedToHuman: true
      }, {
        headers: { token }
      });
      if (res.data.success) {
        setSession(res.data.session);
        setSuggestedReplies([]);
        
        const sysMsg = {
          sessionId: session._id,
          senderId: 'SYSTEM',
          senderType: 'ai',
          senderName: 'System',
          content: 'You have requested a live human agent. Aura has stepped down. A support representative will join this chat shortly.',
          createdAt: new Date()
        };
        setMessages((prev) => [...prev, sysMsg]);
        
        if (socketRef.current) {
          socketRef.current.emit('sendMessage', {
            ...sysMsg,
            senderType: 'user'
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Infinite Scroll
  const handleScroll = async () => {
    if (!chatBodyRef.current || !session) return;
    if (chatBodyRef.current.scrollTop === 0 && messages.length > 0) {
      const firstMsg = messages[0];
      try {
        const res = await axios.get(`${backendUrl}/api/chat/messages`, {
          params: {
            sessionId: session._id,
            before: firstMsg.createdAt
          },
          headers: { token }
        });

        if (res.data.success && res.data.messages.length > 0) {
          const scrollHeightBefore = chatBodyRef.current.scrollHeight;
          setMessages((prev) => [...res.data.messages, ...prev]);
          
          setTimeout(() => {
            if (chatBodyRef.current) {
              chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight - scrollHeightBefore;
            }
          }, 0);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSuggestedClick = (text) => {
    if (text === '🙋 Speak to Agent') {
      triggerHandoff();
    } else if (text === '📧 Email Support') {
      setIsOpen(false);
      navigate('/support-hub?tab=email');
    } else if (text === '📞 Call Support') {
      setIsOpen(false);
      navigate('/support-hub?tab=call');
    } else {
      handleSendMessage(text);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end gap-3">
      {/* Floating Action Button */}
      <div className="flex gap-2">
        {/* Emergency Hotline Button */}
        {token && (
          <button
            onClick={triggerEmergency}
            className={`w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 animate-pulse border-2 border-white`}
            title="EMERGENCY HOTLINE"
          >
            <ShieldAlert size={20} />
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-gradient-to-tr from-primary to-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
          {session && session.unreadCountUser > 0 && !isOpen && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
              {session.unreadCountUser}
            </span>
          )}
        </button>
      </div>

      {/* Emergency alert panel */}
      {emergencyActive && token && (
        <div className="w-[320px] bg-red-50 border-2 border-red-500 rounded-2xl p-4 shadow-2xl animate-bounce flex flex-col gap-2 relative">
          <button onClick={() => setEmergencyActive(false)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
            <Activity className="animate-pulse" /> EMERGENCY SYSTEM TRIGGERED
          </div>
          <p className="text-[11px] text-red-600">Our medical command center has received your alarm. GPS Location registered.</p>
          
          <div className="bg-white/80 p-2.5 rounded-lg border border-red-200 text-[10px] space-y-1">
            <div className="flex items-center gap-1">
              <Truck size={12} className="text-red-600 animate-bounce" /> 
              <strong>Ambulance:</strong> {emergencyDetails?.assignedAmbulance || 'Dispatch Pending'}
            </div>
            <div className="flex items-center gap-1">
              <HeartPulse size={12} className="text-red-600" /> 
              <strong>Doctor:</strong> {emergencyDetails?.assignedDoctorId?.name ? `Dr. ${emergencyDetails.assignedDoctorId.name} (${emergencyDetails.assignedDoctorId.speciality || ''})` : 'Assigning on-call doctor...'}
            </div>
            {emergencyDetails?.assignedNurseId && (
              <div className="flex items-center gap-1">
                <User size={12} className="text-red-600" />
                <strong>Nurse:</strong> {emergencyDetails?.assignedNurseId?.name ? `Nurse ${emergencyDetails.assignedNurseId.name}` : 'Assigning nurse...'}
              </div>
            )}
            <div className="flex items-center gap-1">
              <strong>Status:</strong> 
              <span className={`px-1.5 py-0.2 rounded-full uppercase text-[8px] font-bold animate-pulse ${
                emergencyDetails?.status === 'dispatched' 
                  ? 'bg-red-200 text-red-800' 
                  : emergencyDetails?.status === 'resolved' 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-yellow-200 text-yellow-800'
              }`}>
                {emergencyDetails?.status?.replace('_', ' ') || 'Triggered'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Helpline dialing modal */}
      {callModal && (
        <div className="w-[320px] bg-white rounded-2xl border border-gray-100 p-5 shadow-2xl flex flex-col items-center gap-4 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            callConnected ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-primary/10 text-primary animate-bounce'
          }`}>
            {callConnected ? <PhoneCall size={24} /> : <Phone size={24} />}
          </div>
          <div>
            <h4 className="font-bold text-sm">Prescripto Helpline Support</h4>
            {callConnected ? (
              <p className="text-xs text-gray-400 mt-0.5">Connected: {callExecutiveName}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Calling Prescripto Helpdesk...</p>
            )}
          </div>

          {callConnected ? (
            <div className="space-y-4 w-full">
              <div className="text-xl font-mono text-emerald-600 font-bold animate-pulse">
                {formatTime(callTimer)}
              </div>
              <p className="text-[10px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 italic">
                "{callExecutiveName} is active. Your call notes will automatically save in your history."
              </p>
              <button
                onClick={endCall}
                className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1"
              >
                <PhoneOff size={14} /> End Call
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              <div className="text-xs font-semibold text-primary animate-pulse">
                Ringing...
              </div>
              <button
                onClick={endCall}
                className="w-full border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-1"
              >
                <PhoneOff size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[350px] sm:w-[400px] h-[550px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col border border-gray-100 overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Glassmorphic Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-blue-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <Sparkles size={20} className="text-blue-100 animate-pulse" />
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-primary ${onlineStatus === 'online' ? 'bg-green-400' : 'bg-gray-300'}`}></span>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Aura Health Assistant</h4>
                <p className="text-[10px] text-blue-100">
                  {session?.isAssignedToHuman ? "Live Agent Support Connected" : "AI Assistant Online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {token && (
                <>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/support-hub?tab=email');
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                    title="Email Support Inbox"
                  >
                    <Mail size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/support-hub?tab=call');
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                    title="Call Support Center"
                  >
                    <PhoneCall size={16} />
                  </button>
                  <button
                    onClick={startCall}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                    title="Quick Call Simulation"
                  >
                    <Phone size={16} />
                  </button>
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="hover:opacity-80 transition p-1.5">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div
            ref={chatBodyRef}
            onScroll={handleScroll}
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fafbfe]"
          >
            {!token ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <AlertCircle size={40} className="text-gray-300 mb-3" />
                <p className="text-sm font-medium">Authentication Required</p>
                <p className="text-xs text-gray-400 mt-1">Please login to access live chat and support assistant.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <Sparkles size={32} className="text-primary/40 mb-2 animate-bounce" />
                <p className="text-sm font-semibold">Welcome to Prescripto Support!</p>
                <p className="text-xs mt-1">Ask me about doctor specialities, booking, ward status, or speak with an agent.</p>
              </div>
            ) : (
              messages.map((m, index) => {
                const isMe = m.senderId === userData?._id;
                const isSys = m.senderId === 'SYSTEM';
                return (
                  <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-gray-400 px-1 mb-0.5">{m.senderName}</span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-tr from-primary to-blue-500 text-white rounded-tr-none'
                          : isSys
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs italic'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}
                    >
                      {m.content && <p className="whitespace-pre-line leading-relaxed">{m.content}</p>}
                      {m.attachment && m.attachmentType === 'image' && (
                        <img
                          src={m.attachment}
                          alt="shared"
                          className="mt-2 rounded-lg max-h-48 object-cover w-full cursor-pointer hover:opacity-95 transition"
                          onClick={() => window.open(m.attachment, '_blank')}
                        />
                      )}
                      {m.attachment && m.attachmentType === 'file' && (
                        <a
                          href={m.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 flex items-center gap-2 text-xs bg-gray-50 p-2 rounded-lg text-primary hover:underline border border-gray-100"
                        >
                          <Paperclip size={14} /> Download Document
                        </a>
                      )}
                    </div>
                    {isMe && (
                      <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                        {m.status === 'read' ? 'Seen' : 'Delivered'}
                      </span>
                    )}
                  </div>
                );
              })
            )}

            {/* AI Typing Shimmer Animation */}
            {isAITyping && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-gray-400 px-1 mb-0.5">Aura</span>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Human Agent Typing status */}
            {isAgentTyping && (
              <p className="text-[10px] text-gray-400 italic">Support agent is typing...</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Bar */}
          {suggestedReplies.length > 0 && token && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-none py-2.5">
              {suggestedReplies.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedClick(r)}
                  className="flex-shrink-0 bg-white hover:bg-primary hover:text-white border border-gray-200 hover:border-primary text-gray-600 px-3 py-1 rounded-full text-xs font-medium transition duration-150 whitespace-nowrap shadow-sm"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input Section */}
          {token && (
            <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2 relative">
              {/* Emoji panel */}
              {showEmoji && (
                <div className="absolute bottom-full left-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xl flex gap-2 z-50 flex-wrap max-w-[280px]">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputMessage((p) => p + emoji);
                        setShowEmoji(false);
                      }}
                      className="text-lg hover:scale-125 transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="text-gray-400 hover:text-primary transition p-1"
                >
                  <Smile size={20} />
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploading}
                  className="text-gray-400 hover:text-primary transition p-1"
                >
                  <Paperclip size={20} className={uploading ? 'animate-spin' : ''} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx"
                />

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={session?.isAssignedToHuman ? "Ask agent..." : "Ask Aura..."}
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary focus:bg-white transition"
                />

                <button
                  onClick={() => handleSendMessage()}
                  className="bg-primary hover:bg-blue-600 text-white rounded-xl p-2 transition shadow-md active:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
