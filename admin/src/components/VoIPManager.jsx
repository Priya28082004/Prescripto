import React, { useContext } from 'react';
import { AdminContext } from '../context/AdminContext';
import { PhoneCall, PhoneOff, Phone } from 'lucide-react';

const VoIPManager = () => {
  const {
    incomingCall,
    activeCall,
    callTimer,
    callNotes,
    setCallNotes,
    callStatus,
    setCallStatus,
    callEscalatedDoctor,
    setCallEscalatedDoctor,
    doctors,
    answerIncomingCall,
    declineIncomingCall,
    hangUpActiveCall
  } = useContext(AdminContext);

  // Format call timer
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 📞 GLOBAL INCOMING CALL OVERLAY */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce border-2 border-emerald-400">
              <PhoneCall size={40} className="animate-pulse" />
            </div>
            
            <div>
              <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full uppercase animate-pulse">Incoming Call</span>
              <h4 className="text-xl font-extrabold text-gray-900 mt-3">{incomingCall.patientName}</h4>
              <p className="text-sm text-gray-500 font-mono mt-0.5">{incomingCall.patientPhone}</p>
              <p className="text-xs text-gray-400 mt-2">Prescripto Helpline Support Hotline</p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={answerIncomingCall}
                className="flex-1 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 rounded-2xl transition shadow-lg flex items-center justify-center gap-1.5 text-sm"
              >
                <PhoneCall size={16} /> Answer
              </button>
              <button
                onClick={declineIncomingCall}
                className="border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-bold px-6 py-3 rounded-2xl transition text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗣️ GLOBAL ACTIVE CALL OVERLAY MODAL */}
      {activeCall && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping" />
                <div>
                  <h3 className="font-bold text-sm text-gray-800">Helpline Active: speaking with patient</h3>
                  <p className="text-xs font-semibold text-emerald-600">{activeCall.patientName} ({activeCall.patientPhone})</p>
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-gray-800 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
                {formatTime(callTimer)}
              </div>
            </div>

            {/* Scrollable logger form */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Call Logs & Symptoms Remarks</label>
                <textarea
                  rows={4}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Record symptoms reported, billing questions discussed, or general remarks here..."
                  className="w-full text-xs border rounded-xl p-3 outline-none resize-none leading-relaxed focus:border-emerald-500 text-gray-800 bg-gray-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Disposition Status</label>
                  <select
                    value={callStatus}
                    onChange={(e) => setCallStatus(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 border outline-none bg-white text-gray-800"
                  >
                    <option value="resolved">Resolved (Normal inquiry)</option>
                    <option value="pending">Pending (Awaiting callback)</option>
                    <option value="escalated">Escalated (To on-call doctor)</option>
                  </select>
                </div>

                {callStatus === 'escalated' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">On-Call Doctor Assigned</label>
                    <select
                      value={callEscalatedDoctor}
                      onChange={(e) => setCallEscalatedDoctor(e.target.value)}
                      className="w-full text-xs rounded-xl p-2.5 border outline-none bg-white text-gray-800"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(d => (
                        <option key={d._id} value={d._id}>
                          Dr. {d.name} ({d.speciality})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={hangUpActiveCall}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                <PhoneOff size={16} /> Disconnect & Save Logs
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default VoIPManager;
