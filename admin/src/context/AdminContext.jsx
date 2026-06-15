import axios from "axios";
import { createContext, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

export const AdminContext = createContext();

let activeAdminAudioContext = null;
let activeAdminRingtoneInterval = null;

export const stopAllAdminSounds = () => {
  if (activeAdminAudioContext) {
    try {
      activeAdminAudioContext.close();
    } catch (e) {
      console.warn("Failed to close active admin audio context:", e);
    }
    activeAdminAudioContext = null;
  }
};

const AdminContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [aToken, setAToken] = useState(localStorage.getItem('aToken') ? localStorage.getItem('aToken') : '');

    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [dashData, setDashData] = useState(false);
    const [beds, setBeds] = useState([]);
    const [inpatients, setInpatients] = useState([]);

    // VoIP Calls & Emergency States
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [callTimer, setCallTimer] = useState(0);
    const [callNotes, setCallNotes] = useState('');
    const [callStatus, setCallStatus] = useState('resolved');
    const [callEscalatedDoctor, setCallEscalatedDoctor] = useState('');
    const [emergencies, setEmergencies] = useState([]);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const callIntervalRef = useRef(null);
    const ringtoneIntervalRef = useRef(null);

    const stopRingtone = () => {
        if (activeAdminRingtoneInterval) {
            clearInterval(activeAdminRingtoneInterval);
            activeAdminRingtoneInterval = null;
        }
        if (ringtoneIntervalRef.current) {
            clearInterval(ringtoneIntervalRef.current);
            ringtoneIntervalRef.current = null;
        }
        stopAllAdminSounds();
    };

    const startRingtone = () => {
        stopRingtone();
        playAdminSound('ringtone');
        const interval = setInterval(() => {
            playAdminSound('ringtone');
        }, 2500);
        activeAdminRingtoneInterval = interval;
        ringtoneIntervalRef.current = interval;
    };

    // Audio synthesizer for Admin VoIP alerts
    const playAdminSound = (type = 'newMessage') => {
      if (!soundEnabled) return;
      try {
        stopAllAdminSounds();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        activeAdminAudioContext = audioCtx;
        if (type === 'ringtone') {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc1.type = 'sine'; osc1.frequency.setValueAtTime(400, audioCtx.currentTime);
          osc2.type = 'sine'; osc2.frequency.setValueAtTime(450, audioCtx.currentTime);
          osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.4);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.6);
          gain.gain.setValueAtTime(0, audioCtx.currentTime + 1.0);
          osc1.start(); osc2.start();
          osc1.stop(audioCtx.currentTime + 1.2); osc2.stop(audioCtx.currentTime + 1.2);
        } else if (type === 'siren') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.type = 'sawtooth'; gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.4);
          osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.8);
          osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 1.2);
          osc.start(); osc.stop(audioCtx.currentTime + 1.5);
        }
      } catch (e) {}
    };

    const fetchEmergencies = async () => {
        if (!aToken) return;
        try {
            const res = await axios.get(`${backendUrl}/api/support-channel/emergency/list`, {
                headers: { atoken: aToken }
            });
            if (res.data.success) {
                setEmergencies(res.data.alerts);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Global Socket Setup
    useEffect(() => {
        if (!aToken) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setSocket(null);
            return;
        }

        const socketInstance = io(backendUrl);
        socketRef.current = socketInstance;
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            console.log("Global Admin socket connected:", socketInstance.id);
            socketInstance.emit('joinAgentRoom', { agentId: 'admin_user' });
        });

        socketInstance.on('incomingCallAlert', (callData) => {
            console.log("Global Incoming call alert received:", callData);
            setIncomingCall(callData);
            startRingtone();
        });

        socketInstance.on('callEnded', () => {
            console.log("Global Active call ended by peer");
            stopRingtone();
            setActiveCall(null);
            setIncomingCall(null);
            toast.info("Call disconnected by user.");
        });
        socketInstance.on('emergencyTriggered', (alertData) => {
            console.log("Global Emergency triggered:", alertData);
            fetchEmergencies();
            playAdminSound('siren');
            toast.error(`🚨 EMERGENCY ALARM: ${alertData.patientName} triggered emergency at ${alertData.location}!`);
        });

        return () => {
            socketInstance.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [aToken, backendUrl]);



    // Active call timer
    useEffect(() => {
        if (activeCall) {
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
    }, [activeCall]);

    // Call Action handlers
    const answerIncomingCall = () => {
        if (!incomingCall) return;
        stopRingtone();
        if (socketRef.current) {
            socketRef.current.emit('adminCallAnswer', {
                patientSocketId: incomingCall.socketId,
                executiveName: 'Receptionist Sarah'
            });
        }
        setActiveCall(incomingCall);
        setIncomingCall(null);
        toast.success("Call answered! Connected to patient.");
    };

    const declineIncomingCall = () => {
        if (!incomingCall) return;
        stopRingtone();
        if (socketRef.current) {
            socketRef.current.emit('callDisconnected', {
                targetSocketId: incomingCall.socketId
            });
        }
        setIncomingCall(null);
        toast.info("Call declined.");
    };

    const hangUpActiveCall = async () => {
        if (!activeCall) return;
        stopRingtone();
        if (socketRef.current) {
            socketRef.current.emit('callDisconnected', {
                targetSocketId: activeCall.socketId
            });
        }

        try {
            await axios.post(`${backendUrl}/api/support-channel/call/log`, {
                patientId: activeCall.patientId,
                executiveName: 'Receptionist Sarah',
                callNotes: callNotes || "Call completed. No special actions taken.",
                isEscalated: callStatus === 'escalated',
                escalatedDoctorId: callStatus === 'escalated' ? callEscalatedDoctor : null,
                status: callStatus
            }, {
                headers: { atoken: aToken }
            });
            toast.success("Call logged and saved!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save call log.");
        } finally {
            setActiveCall(null);
            setCallNotes('');
            setCallStatus('resolved');
        }
    };

    // Getting all Doctors data from Database using API
    const getAllDoctors = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/admin/all-doctors', { headers: { aToken } })
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }

    }

    // Function to change doctor availablity using API
    const changeAvailability = async (docId) => {
        try {

            const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, { headers: { aToken } })
            if (data.success) {
                toast.success(data.message)
                getAllDoctors()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }


    // Getting all appointment data from Database using API
    const getAllAppointments = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { aToken } })
            if (data.success) {
                setAppointments(data.appointments.reverse())
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }

    }

    // Function to cancel appointment using API
    const cancelAppointment = async (appointmentId) => {

        try {

            const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { headers: { aToken } })

            if (data.success) {
                toast.success(data.message)
                getAllAppointments()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }

    }

    // Getting Admin Dashboard data from Database using API
    const getDashData = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: { aToken } })

            if (data.success) {
                setDashData(data.dashData)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    // Get all beds
    const getBeds = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/beds', { headers: { aToken } })
            if (data.success) {
                setBeds(data.beds)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Get all inpatients
    const getInpatients = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/inpatients', { headers: { aToken } })
            if (data.success) {
                setInpatients(data.admissions)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Admit Patient Function
    const admitPatient = async (patientId, doctorId, problem_description, required_checkups, wardType, bedNumber, severityLevel) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/admit-patient', { patientId, doctorId, problem_description, required_checkups, wardType, bedNumber, severityLevel }, { headers: { aToken } })
            if (data.success) {
                toast.success(data.message)
                getAllAppointments() // refresh appointments (though it doesn't delete, just shows as completed or so. Wait, admission doesn't actually complete appointment directly unless we do. Let's just refresh)
                return true;
            } else {
                toast.error(data.message)
                return false;
            }
        } catch (error) {
            toast.error(error.message)
            return false;
        }
    }

    const value = {
        aToken, setAToken,
        doctors,
        getAllDoctors,
        changeAvailability,
        appointments,
        getAllAppointments,
        getDashData,
        cancelAppointment,
        dashData,
        beds, getBeds, admitPatient,
        inpatients, getInpatients, backendUrl,
        
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
    }

    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    )

}

export default AdminContextProvider