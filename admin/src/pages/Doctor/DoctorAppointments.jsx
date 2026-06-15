import React, { useState } from 'react'
import { useContext, useEffect } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

const DoctorAppointments = () => {

  const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment, updateStatusAndAdvice } = useContext(DoctorContext)
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)

  const [showModal, setShowModal] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState(null)

  // Form states
  const [status, setStatus] = useState('Waiting')
  const [medicines, setMedicines] = useState('')
  const [tests, setTests] = useState('')
  const [advice, setAdvice] = useState('')
  const [admitReason, setAdmitReason] = useState('')
  const [doctorNotes, setDoctorNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')

  useEffect(() => {
    if (dToken) {
      getAppointments()
    }
  }, [dToken])

  const openManageModal = (appointment) => {
    setActiveAppointment(appointment)
    setStatus(appointment.status || 'Waiting')
    setAdmitReason(appointment.admitReason || '')
    setDoctorNotes(appointment.doctorNotes || '')
    setFollowUpDate(appointment.followUpDate || '')
    
    if (appointment.preAdmitAdvice && appointment.preAdmitAdvice.length > 0) {
      const adv = appointment.preAdmitAdvice[0]
      setMedicines(adv.medicines || '')
      setTests(adv.tests || '')
      setAdvice(adv.advice || '')
    } else {
      setMedicines('')
      setTests('')
      setAdvice('')
    }
    
    setShowModal(true)
  }

  const handleUpdate = async () => {
    if (!activeAppointment) return;

    const preAdmitAdviceArray = [{
      medicines,
      tests,
      advice
    }]

    const payload = {
      appointmentId: activeAppointment._id,
      status,
      preAdmitAdvice: preAdmitAdviceArray,
      admitReason,
      doctorNotes,
      followUpDate
    }

    await updateStatusAndAdvice(payload)
    setShowModal(false)
  }

  return (
    <div className='w-full max-w-6xl m-5 relative'>

      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1.5fr] gap-1 py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Action</p>
        </div>
        {appointments.map((item, index) => (
          <div className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1.5fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={index}>
            <p className='max-sm:hidden'>{index + 1}</p>
            <div className='flex items-center gap-2'>
              <img src={item.userData.image} className='w-8 rounded-full' alt="" /> <p>{item.userData.name}</p>
            </div>
            <div>
              <p className='text-xs inline border border-primary px-2 rounded-full'>
                {item.payment ? 'Online' : 'CASH'}
              </p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            <p>{currency}{item.amount}</p>
            
            <div className='flex items-center gap-2'>
              {item.cancelled ? (
                <p className='text-red-400 text-xs font-medium'>Cancelled</p>
              ) : item.isCompleted ? (
                <p className='text-green-500 text-xs font-medium'>Completed</p>
              ) : (
                <div className='flex items-center gap-2'>
                  <img onClick={() => cancelAppointment(item._id)} className='w-8 cursor-pointer' src={assets.cancel_icon} alt="Cancel" title="Cancel Appointment" />
                  <img onClick={() => completeAppointment(item._id)} className='w-8 cursor-pointer' src={assets.tick_icon} alt="Complete" title="Mark Completed" />
                  <button onClick={() => openManageModal(item)} className='bg-primary text-white text-xs px-3 py-1.5 rounded cursor-pointer'>
                    Manage
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MANAGE APPOINTMENT MODAL */}
      {showModal && activeAppointment && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white rounded-lg p-6 w-[90%] sm:w-[500px] max-h-[90vh] overflow-y-auto relative'>
            <button 
              onClick={() => setShowModal(false)}
              className='absolute top-4 right-4 text-gray-400 hover:text-black font-bold text-xl'
            >
              &times;
            </button>
            <h2 className='text-xl font-medium mb-4'>Manage Appointment</h2>
            <p className='mb-4 text-sm text-gray-500'>Patient: <strong>{activeAppointment.userData.name}</strong></p>

            <div className='flex flex-col gap-3 text-sm'>
              {/* STATUS */}
              <div className='flex flex-col gap-1'>
                <label className='font-medium text-gray-700'>Current Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className='border rounded px-3 py-2'>
                  <option value="Waiting">Waiting</option>
                  <option value="Checked">Checked</option>
                  <option value="Admitted">Admitted</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>

              {/* ADMIT REASON */}
              <div className='flex flex-col gap-1'>
                <label className='font-medium text-gray-700'>Admit Reason (if applicable)</label>
                <select value={admitReason} onChange={(e) => setAdmitReason(e.target.value)} className='border rounded px-3 py-2'>
                  <option value="">None</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Observation">Observation</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* PRE-ADMIT ADVICE */}
              <div className='mt-2 p-3 bg-blue-50 border border-blue-100 rounded flex flex-col gap-3'>
                <h3 className='font-medium text-blue-800'>Pre-Admit Advice</h3>
                
                <div className='flex flex-col gap-1'>
                  <label className='text-xs text-blue-700'>Medicines (comma separated)</label>
                  <input type='text' value={medicines} onChange={(e) => setMedicines(e.target.value)} className='border border-blue-200 rounded px-2 py-1' placeholder='e.g., Paracetamol, Amoxicillin' />
                </div>

                <div className='flex flex-col gap-1'>
                  <label className='text-xs text-blue-700'>Tests (Blood, X-Ray, etc.)</label>
                  <input type='text' value={tests} onChange={(e) => setTests(e.target.value)} className='border border-blue-200 rounded px-2 py-1' placeholder='e.g., CBC, Chest X-Ray' />
                </div>

                <div className='flex flex-col gap-1'>
                  <label className='text-xs text-blue-700'>Rest & General Advice</label>
                  <textarea value={advice} onChange={(e) => setAdvice(e.target.value)} className='border border-blue-200 rounded px-2 py-1 text-xs' rows={2} placeholder='e.g., Drink plenty of water, soft diet'></textarea>
                </div>
              </div>

              {/* DOCTOR NOTES */}
              <div className='flex flex-col gap-1 mt-2'>
                <label className='font-medium text-gray-700'>Doctor Notes (Internal/Emergency/Allergies)</label>
                <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} className='border rounded px-3 py-2 text-sm' rows={3} placeholder='Special instructions, allergies, emergency notes...'></textarea>
              </div>

              {/* FOLLOW UP */}
              <div className='flex flex-col gap-1 mt-2'>
                <label className='font-medium text-gray-700'>Follow-Up Date (if not admitted)</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className='border rounded px-3 py-2' />
              </div>

              {/* SAVE BUTTON */}
              <button onClick={handleUpdate} className='mt-4 bg-primary text-white rounded py-2 font-medium hover:bg-blue-600 transition-colors'>
                Save Details & Advice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default DoctorAppointments