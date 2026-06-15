import React, { useEffect, useState, useContext } from 'react'
import { assets } from '../../assets/assets'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Printer, Download, CreditCard, Banknote, Clock, CheckCircle } from 'lucide-react'

const AllAppointments = () => {

  const { aToken, appointments, cancelAppointment, getAllAppointments, beds, getBeds, admitPatient, backendUrl } = useContext(AdminContext)
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)

  const [admitModal, setAdmitModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)
  
  // Form states
  const [problemDesc, setProblemDesc] = useState('')
  const [wardType, setWardType] = useState('General')
  const [bedNumber, setBedNumber] = useState('')
  const [severityLevel, setSeverityLevel] = useState('Normal')
  const [requiredCheckups, setRequiredCheckups] = useState('')

  // Summary Card State
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState(null)

  // Billing States
  const [billingModalOpen, setBillingModalOpen] = useState(false)
  const [viewBillModalOpen, setViewBillModalOpen] = useState(false)
  const [activeBill, setActiveBill] = useState(null)
  
  // Billing Form States
  const [doctorFees, setDoctorFees] = useState(0)
  const [testCharges, setTestCharges] = useState(0)
  const [medicineCharges, setMedicineCharges] = useState(0)
  const [roomCharges, setRoomCharges] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)

  const handleGenerateBill = async (e) => {
    e.preventDefault()
    if (!selectedAppt) return

    try {
      const { data } = await axios.post(backendUrl + '/api/billing/generate', {
        appointmentId: selectedAppt._id,
        doctorFees,
        testCharges,
        medicineCharges,
        roomCharges,
        discount,
        tax
      }, { headers: { atoken: aToken } })

      if (data.success) {
        toast.success(data.message)
        setBillingModalOpen(false)
        setActiveBill(data.billing)
        setViewBillModalOpen(true)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const checkOrOpenBilling = async (appt) => {
    try {
      const { data } = await axios.get(backendUrl + `/api/billing/appointment/${appt._id}`)
      if (data.success && data.billing) {
        setActiveBill(data.billing)
        setViewBillModalOpen(true)
      } else {
        setSelectedAppt(appt)
        setDoctorFees(appt.docData.fees || appt.amount || 0)
        setTestCharges(0)
        setMedicineCharges(0)
        setRoomCharges(0)
        setDiscount(0)
        setTax(0)
        setBillingModalOpen(true)
      }
    } catch (err) {
      setSelectedAppt(appt)
      setDoctorFees(appt.docData.fees || appt.amount || 0)
      setTestCharges(0)
      setMedicineCharges(0)
      setRoomCharges(0)
      setDiscount(0)
      setTax(0)
      setBillingModalOpen(true)
    }
  }

  const confirmPaymentOffline = async (appointmentId, method) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/billing/confirm-payment', {
        appointmentId,
        paymentMethod: method,
        paymentStatus: 'Confirmed'
      })

      if (data.success) {
        toast.success(`Payment confirmed via ${method}`)
        if (activeBill && activeBill.appointmentId === appointmentId) {
          setActiveBill(prev => ({
            ...prev,
            paymentStatus: 'Confirmed',
            paymentMethod: method
          }))
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (aToken) {
      getAllAppointments()
      getBeds()
    }
  }, [aToken])

  const handleAdmitSubmit = async (e) => {
    e.preventDefault()
    if (!selectedAppt) return
    
    // Convert comma separated string to array
    const checkupsArray = requiredCheckups ? requiredCheckups.split(',').map(item => item.trim()) : [];

    const success = await admitPatient(
      selectedAppt.userId, 
      selectedAppt.docId, 
      problemDesc, 
      checkupsArray, 
      wardType, 
      bedNumber,
      severityLevel
    )
    
    if (success) {
      setSummaryData({
        patientName: selectedAppt.userData.name,
        doctorName: selectedAppt.docData.name,
        diagnosis: problemDesc,
        severityLevel: severityLevel,
        assignedBed: bedNumber,
        requiredTests: requiredCheckups || 'None',
        admissionTime: new Date().toLocaleString()
      })
      setShowSummary(true)

      setAdmitModal(false)
      setSelectedAppt(null)
      // Reset form
      setProblemDesc(''); setBedNumber(''); setSeverityLevel('Normal'); setRequiredCheckups('');
    }
  }

  const handleNotAdmit = async () => {
    if (!selectedAppt) return
    // Cancel the appointment to mark it as not admitted/closed from the queue
    await cancelAppointment(selectedAppt._id)
    setAdmitModal(false)
    setSelectedAppt(null)
  }

  const handleAutoAssign = () => {
    const availableBed = beds.find(b => b.wardType === wardType && b.isAvailable)
    if (availableBed) {
      setBedNumber(availableBed.bedNumber)
    } else {
      alert(`No available beds in ${wardType} ward.`)
    }
  }

  return (
    <div className='w-full max-w-6xl m-5 '>

      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Action</p>
        </div>
        {appointments.map((item, index) => (
          <div className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={index}>
            <p className='max-sm:hidden'>{index+1}</p>
            <div className='flex items-center gap-2'>
              <img src={item.userData.image} className='w-8 rounded-full' alt="" /> <p>{item.userData.name}</p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            <div className='flex items-center gap-2'>
              <img src={item.docData.image} className='w-8 rounded-full bg-gray-200' alt="" /> <p>{item.docData.name}</p>
            </div>
            <p>{currency}{item.amount}</p>
            {item.cancelled 
              ? <p className='text-red-400 text-xs font-medium'>Cancelled</p> 
              : item.isCompleted 
                ? <div className='flex flex-col gap-1 items-center'>
                    <p className='text-green-500 text-xs font-medium'>Completed</p>
                    <button onClick={() => checkOrOpenBilling(item)} className='bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm transition-all duration-300'>Billing / Invoice</button>
                  </div> 
                : <div className='flex gap-2 items-center'>
                    <button onClick={() => { setSelectedAppt(item); setAdmitModal(true); }} className='bg-primary text-white px-2 py-1 rounded text-xs hover:bg-opacity-80 transition'>Admit</button>
                    <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
                  </div>
            }
          </div>
        ))}
      </div>
      
      {/* Admit Patient Modal */}
      {admitModal && selectedAppt && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto'>
            <h2 className='text-xl font-bold mb-4 border-b pb-2'>Admit Patient: {selectedAppt.userData.name}</h2>
            <form onSubmit={handleAdmitSubmit} className='space-y-4'>
              
              <div className='grid grid-cols-2 gap-4'>
                <div className='col-span-2'>
                  <label className='block text-sm font-medium'>Diagnosis / Problem</label>
                  <input required value={problemDesc} onChange={e => setProblemDesc(e.target.value)} type='text' className='w-full border p-2 rounded mt-1' placeholder='Enter detailed diagnosis'/>
                </div>

                <div>
                  <label className='block text-sm font-medium'>Severity Level</label>
                  <select value={severityLevel} onChange={e => setSeverityLevel(e.target.value)} className='w-full border p-2 rounded mt-1 bg-yellow-50'>
                    <option value="Normal">Normal</option>
                    <option value="Serious">Serious</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                
                <div>
                    <label className='block text-sm font-medium text-blue-800'>Required Tests (comma separated)</label>
                    <input value={requiredCheckups} onChange={e => setRequiredCheckups(e.target.value)} type='text' className='w-full border p-2 rounded mt-1 border-blue-200' placeholder='e.g. CBC, X-Ray, MRI'/>
                </div>

                <div>
                  <label className='block text-sm font-medium'>Ward Type</label>
                  <select value={wardType} onChange={e => { setWardType(e.target.value); setBedNumber(''); }} className='w-full border p-2 rounded mt-1'>
                    <option value="General">General</option>
                    <option value="ICU">ICU</option>
                    <option value="Private">Private</option>
                  </select>
                </div>

                <div>
                  <div className='flex justify-between items-center'>
                    <label className='block text-sm font-medium'>Assign Bed</label>
                    <button type="button" onClick={handleAutoAssign} className='text-xs text-primary hover:underline font-semibold'>Auto Assign</button>
                  </div>
                  <select required value={bedNumber} onChange={e => setBedNumber(e.target.value)} className='w-full border p-2 rounded mt-1'>
                    <option value="" disabled>Select a Bed</option>
                    {beds.filter(b => b.wardType === wardType && b.isAvailable).map(b => (
                      <option key={b._id} value={b.bedNumber}>{b.bedNumber} - {currency}{b.dailyRate}/day</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='flex justify-between items-center mt-6 pt-4 border-t'>
                <button type='button' onClick={handleNotAdmit} className='px-4 py-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded hover:bg-red-100 font-medium'>
                  Not Admitted (OPD)
                </button>
                <div className='flex gap-2'>
                  <button type='button' onClick={() => setAdmitModal(false)} className='px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200'>Cancel</button>
                  <button type='submit' className='px-4 py-2 text-white bg-primary rounded hover:bg-opacity-90 font-medium'>Confirm Admission</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admission Summary Modal */}
      {showSummary && summaryData && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white p-6 rounded-lg shadow-2xl w-full max-w-sm border-t-4 border-primary'>
            <div className='flex justify-center mb-4'>
              <div className='bg-green-100 text-green-600 p-3 rounded-full'>
                <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7'></path></svg>
              </div>
            </div>
            <h2 className='text-xl font-bold mb-4 text-center'>Admission Confirmed</h2>
            
            <div className='bg-gray-50 p-4 rounded-md space-y-3 text-sm'>
              <div className='flex justify-between border-b pb-2'>
                <span className='text-gray-500'>Patient</span>
                <span className='font-medium'>{summaryData.patientName}</span>
              </div>
              <div className='flex justify-between border-b pb-2'>
                <span className='text-gray-500'>Doctor</span>
                <span className='font-medium'>{summaryData.doctorName}</span>
              </div>
              <div className='flex justify-between border-b pb-2'>
                <span className='text-gray-500'>Diagnosis</span>
                <span className='font-medium'>{summaryData.diagnosis}</span>
              </div>
              <div className='flex justify-between border-b pb-2'>
                <span className='text-gray-500'>Severity</span>
                <span className={`font-bold ${summaryData.severityLevel === 'Critical' ? 'text-red-500' : summaryData.severityLevel === 'Serious' ? 'text-orange-500' : 'text-green-500'}`}>{summaryData.severityLevel}</span>
              </div>
              <div className='flex justify-between border-b pb-2'>
                <span className='text-gray-500'>Tests</span>
                <span className='font-medium max-w-[50%] text-right truncate' title={summaryData.requiredTests}>{summaryData.requiredTests}</span>
              </div>
              <div className='flex justify-between border-b pb-2'>
                <span className='text-gray-500'>Assigned Bed</span>
                <span className='font-bold text-primary'>{summaryData.assignedBed}</span>
              </div>
              <div className='flex flex-col pt-1'>
                <span className='text-gray-500 text-xs text-center w-full'>Admission Time</span>
                <span className='font-medium text-xs text-center'>{summaryData.admissionTime}</span>
              </div>
            </div>

            <button 
              onClick={() => setShowSummary(false)} 
              className='mt-6 w-full px-4 py-2 text-white bg-primary rounded hover:bg-opacity-90 font-medium'
            >
              Close & Print Summary
            </button>
          </div>
        </div>
      )}

      {/* 1. Generate Billing Invoice Modal */}
      {billingModalOpen && selectedAppt && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-xs'>
          <div className='bg-white p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border-t-4 border-emerald-500'>
            <h2 className='text-xl font-bold mb-4 text-gray-800 pb-2 border-b'>Generate Billing Invoice</h2>
            <div className='bg-emerald-50 p-3 rounded-lg text-emerald-800 text-xs mb-4'>
              <p className='font-bold'>Patient: {selectedAppt.userData.name}</p>
              <p className='mt-0.5'>Doctor Consulted: Dr. {selectedAppt.docData.name}</p>
            </div>
            
            <form onSubmit={handleGenerateBill} className='space-y-4 text-sm'>
              <div>
                <label className='block font-medium text-gray-700'>Doctor Consultation Fees ({currency})</label>
                <input required type='number' value={doctorFees} onChange={e => setDoctorFees(Number(e.target.value))} className='w-full border p-2 rounded mt-1' min='0'/>
              </div>
              
              <div>
                <label className='block font-medium text-gray-700'>Diagnostic & Lab Test Charges ({currency})</label>
                <input type='number' value={testCharges} onChange={e => setTestCharges(Number(e.target.value))} className='w-full border p-2 rounded mt-1' min='0'/>
              </div>

              <div>
                <label className='block font-medium text-gray-700'>Pharmacy & Medicine Charges ({currency})</label>
                <input type='number' value={medicineCharges} onChange={e => setMedicineCharges(Number(e.target.value))} className='w-full border p-2 rounded mt-1' min='0'/>
              </div>

              <div>
                <label className='block font-medium text-gray-700'>Bed & Room Charges ({currency})</label>
                <input type='number' value={roomCharges} onChange={e => setRoomCharges(Number(e.target.value))} className='w-full border p-2 rounded mt-1' min='0'/>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block font-medium text-gray-700'>Discount ({currency})</label>
                  <input type='number' value={discount} onChange={e => setDiscount(Number(e.target.value))} className='w-full border p-2 rounded mt-1 text-emerald-600' min='0'/>
                </div>
                <div>
                  <label className='block font-medium text-gray-700'>Service Tax ({currency})</label>
                  <input type='number' value={tax} onChange={e => setTax(Number(e.target.value))} className='w-full border p-2 rounded mt-1 text-red-500' min='0'/>
                </div>
              </div>

              <div className='bg-gray-50 p-4 rounded-xl space-y-1 mt-4 text-xs font-semibold'>
                <div className='flex justify-between text-gray-600'>
                  <span>Subtotal:</span>
                  <span>{currency}{(doctorFees + testCharges + medicineCharges + roomCharges)}</span>
                </div>
                <div className='flex justify-between text-emerald-600'>
                  <span>Discount:</span>
                  <span>-{currency}{discount}</span>
                </div>
                <div className='flex justify-between text-red-500'>
                  <span>Tax:</span>
                  <span>+{currency}{tax}</span>
                </div>
                <div className='flex justify-between text-base font-extrabold text-gray-900 border-t border-dashed pt-2 mt-2'>
                  <span>Net Total:</span>
                  <span>{currency}{(doctorFees + testCharges + medicineCharges + roomCharges - discount + tax)}</span>
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-4 border-t'>
                <button type='button' onClick={() => setBillingModalOpen(false)} className='px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200'>Cancel</button>
                <button type='submit' className='px-5 py-2 text-white bg-emerald-500 rounded font-bold hover:bg-emerald-600 shadow transition-all duration-300'>Generate Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Official Printable Invoice Modal */}
      {viewBillModalOpen && activeBill && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 no-print'>
          {/* Custom style to make modal printable */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden;
              }
              .print-invoice-view, .print-invoice-view * {
                visibility: visible;
              }
              .print-invoice-view {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />
          
          <div className='bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'>
            {/* Modal Controls */}
            <div className='bg-gray-50 border-b px-6 py-4 flex justify-between items-center no-print'>
              <span className='text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1'>
                <span className='w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse'></span> Official invoice generated
              </span>
              <div className='flex items-center gap-3'>
                <button 
                  onClick={() => window.print()}
                  className='flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-opacity-95 shadow transition'
                >
                  <Printer className='w-3.5 h-3.5' /> Print / Save PDF
                </button>
                <button 
                  onClick={() => { setViewBillModalOpen(false); setActiveBill(null); }}
                  className='text-gray-400 hover:text-gray-600 text-lg font-bold'
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className='p-8 overflow-y-auto flex-1 print-invoice-view bg-white'>
              <div className='flex justify-between items-start border-b pb-6 mb-6'>
                <div>
                  <h1 className='text-2xl font-black tracking-tight text-primary flex items-center gap-1.5'>
                    PRESCRIPTO <span className='text-xs font-medium text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded'>HMS</span>
                  </h1>
                  <p className='text-xs text-gray-400 mt-1.5'>Premium Multi-Speciality Medical Hub</p>
                  <p className='text-xs text-gray-400'>120 Park Avenue, Salt Lake, Sector-V</p>
                  <p className='text-xs text-gray-400'>Email: billing@prescripto.com</p>
                </div>
                <div className='text-right'>
                  <h2 className='text-3xl font-extrabold tracking-tight text-gray-800'>INVOICE</h2>
                  <p className='text-sm font-mono font-bold text-gray-500 mt-1'>{activeBill.invoiceNumber}</p>
                  <p className='text-xs text-gray-400 mt-1'>Date: {new Date(activeBill.billingDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Billed info */}
              <div className='grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl mb-6'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'>Billed To:</p>
                  <p className='font-bold text-gray-800 text-sm'>{activeBill.patientData ? activeBill.patientData.name : 'N/A'}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>DOB: {activeBill.patientData ? activeBill.patientData.dob : 'N/A'}</p>
                  <p className='text-xs text-gray-500'>Email: {activeBill.patientData ? activeBill.patientData.email : 'N/A'}</p>
                </div>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'>Provider Details:</p>
                  <p className='font-bold text-gray-800 text-sm'>Dr. {activeBill.docData ? activeBill.docData.name : 'N/A'}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{activeBill.docData ? activeBill.docData.speciality : 'N/A'}</p>
                  <p className='text-xs text-gray-500'>Department: Clinical Services</p>
                </div>
              </div>

              {/* Itemized list */}
              <div className='mb-8'>
                <h3 className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-3'>Itemized Medical Charges</h3>
                <div className='border rounded-2xl overflow-hidden'>
                  <div className='grid grid-cols-[3fr_1.5fr] bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-5 border-b'>
                    <p>Description</p>
                    <p className='text-right'>Amount</p>
                  </div>
                  <div className='divide-y text-sm text-gray-700'>
                    <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                      <p className='font-medium'>Doctor Consultation Fee</p>
                      <p className='text-right font-semibold'>{currency}{activeBill.doctorFees}</p>
                    </div>
                    {activeBill.testCharges > 0 && (
                      <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                        <p className='font-medium'>Diagnostic & Lab Tests (Added)</p>
                        <p className='text-right font-semibold'>{currency}{activeBill.testCharges}</p>
                      </div>
                    )}
                    {activeBill.medicineCharges > 0 && (
                      <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                        <p className='font-medium'>Prescribed Pharmacy & Medicines (Added)</p>
                        <p className='text-right font-semibold'>{currency}{activeBill.medicineCharges}</p>
                      </div>
                    )}
                    {activeBill.roomCharges > 0 && (
                      <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                        <p className='font-medium'>Inpatient Ward & Bed Charges (Added)</p>
                        <p className='text-right font-semibold'>{currency}{activeBill.roomCharges}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className='flex justify-between items-start border-t pt-6'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5'>Payment Details</p>
                  <div className='flex items-center gap-1.5'>
                    {activeBill.paymentStatus === 'Confirmed' ? (
                      <>
                        <div className='w-2 h-2 rounded-full bg-emerald-500'></div>
                        <p className='text-xs font-bold text-emerald-600 uppercase'>PAID ({activeBill.paymentMethod})</p>
                      </>
                    ) : (
                      <>
                        <div className='w-2 h-2 rounded-full bg-amber-500 animate-pulse'></div>
                        <p className='text-xs font-bold text-amber-600 uppercase'>UNPAID (Awaiting Settlement)</p>
                      </>
                    )}
                  </div>
                  
                  {activeBill.paymentStatus !== 'Confirmed' && (
                    <div className='mt-3 flex gap-2 no-print'>
                      <button 
                        onClick={() => confirmPaymentOffline(activeBill.appointmentId, 'Cash')}
                        className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1'
                      >
                        Confirm Cash
                      </button>
                      <button 
                        onClick={() => confirmPaymentOffline(activeBill.appointmentId, 'Card/UPI')}
                        className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1'
                      >
                        Confirm Card/UPI
                      </button>
                    </div>
                  )}
                </div>
                
                <div className='w-64 space-y-2 text-sm text-gray-600'>
                  <div className='flex justify-between'>
                    <span>Subtotal</span>
                    <span className='font-semibold text-gray-800'>{currency}{activeBill.subtotal}</span>
                  </div>
                  {activeBill.discount > 0 && (
                    <div className='flex justify-between text-emerald-600'>
                      <span>Discount</span>
                      <span>-{currency}{activeBill.discount}</span>
                    </div>
                  )}
                  {activeBill.tax > 0 && (
                    <div className='flex justify-between'>
                      <span>Service Tax</span>
                      <span className='font-semibold text-gray-800'>+{currency}{activeBill.tax}</span>
                    </div>
                  )}
                  <div className='flex justify-between border-t border-dashed pt-2.5 text-base text-gray-900 font-extrabold'>
                    <span>Total Amount</span>
                    <span className='text-xl text-primary'>{currency}{activeBill.total}</span>
                  </div>
                </div>
              </div>

              {/* Document footer */}
              <div className='border-t border-dashed mt-10 pt-6 text-center text-xs text-gray-400 space-y-1'>
                <p className='font-semibold text-gray-500'>Thank you for choosing Prescripto Medical Hub!</p>
                <p>This is a computer-generated official billing invoice. For medical insurance claims, please consult our administrative counter.</p>
                <p>Prescripto HMS Care • Helpline: +1 (800) 555-CARE</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AllAppointments