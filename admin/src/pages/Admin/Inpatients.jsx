import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Inpatients = () => {
  const { aToken, inpatients, getInpatients, backendUrl } = useContext(AdminContext)
  const { currency } = useContext(AppContext)

  const [selectedPatient, setSelectedPatient] = useState(null)
  const [modalType, setModalType] = useState('') // 'treatment' or 'discharge'

  // Treatment Form state
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medTiming, setMedTiming] = useState('')
  const [notes, setNotes] = useState('')

  // Discharge Bill Form state
  const [doctorFees, setDoctorFees] = useState(0)
  const [testCharges, setTestCharges] = useState(0)
  const [medicinesTotal, setMedicinesTotal] = useState(0)

  useEffect(() => {
    if (aToken) {
      getInpatients()
    }
  }, [aToken])

  const handleAddTreatment = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return

    let newMedicines = []
    if (medName) {
      newMedicines.push({ name: medName, dose: medDose, timing: medTiming })
    }

    try {
      const { data } = await axios.post(backendUrl + '/api/admin/add-treatment', {
        admissionId: selectedPatient._id,
        newMedicines,
        additionalNotes: notes
      }, { headers: { aToken } })

      if (data.success) {
        toast.success(data.message)
        getInpatients()
        setModalType('')
        setMedName(''); setMedDose(''); setMedTiming(''); setNotes('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDischarge = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return

    try {
      const { data } = await axios.post(backendUrl + '/api/admin/discharge-patient', {
        admissionId: selectedPatient._id,
        doctorFees, testCharges, medicinesTotal,
        dischargeSummary: "Patient discharged successfully. Billing confirmed."
      }, { headers: { aToken } })

      if (data.success) {
        toast.success(data.message)
        getInpatients()
        setModalType('')
        // Optionally trigger a print feature
        setTimeout(() => alert(`Discharge Complete! Total Bill: ${currency}${data.billing.totalAmount}`), 500)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className='w-full max-w-6xl m-5'>
      <p className='mb-3 text-lg font-medium'>Active Inpatients</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[1fr_2fr_1fr_2fr_3fr] py-3 px-6 border-b bg-gray-50'>
          <p className='font-medium'>Patient ID</p>
          <p className='font-medium'>Ward & Bed</p>
          <p className='font-medium'>Admitted Date</p>
          <p className='font-medium'>Diagnosis</p>
          <p className='font-medium text-center'>Actions</p>
        </div>
        
        {inpatients.length === 0 ? <p className='p-6 text-gray-500 text-center text-base'>No patients are currently admitted.</p> : null}

        {inpatients.map((item, index) => (
          <div className='flex flex-col sm:grid sm:grid-cols-[1fr_2fr_1fr_2fr_3fr] items-center text-gray-600 py-4 px-6 border-b hover:bg-gray-50' key={index}>
            <p className='text-xs font-mono bg-gray-100 px-2 py-1 rounded'>{item.patientId.slice(-6)}</p>
            <p className='font-semibold text-primary'>{item.wardType} / {item.bedNumber}</p>
            <p>{new Date(item.admission_date).toLocaleDateString()}</p>
            <p className='truncate pr-4' title={item.problem_description}>{item.problem_description}</p>
            
            <div className='flex gap-2 justify-center w-full mt-2 sm:mt-0'>
              <button 
                onClick={() => { setSelectedPatient(item); setModalType('treatment') }} 
                className='bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded text-xs hover:bg-blue-100 transition'
              >Add Treatment</button>
              
              <button 
                onClick={() => { setSelectedPatient(item); setModalType('discharge') }} 
                className='bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded text-xs hover:bg-green-100 transition'
              >Bill & Discharge</button>
            </div>
          </div>
        ))}
      </div>

      {/* TREATMENT MODAL */}
      {modalType === 'treatment' && selectedPatient && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4'>
           <div className='bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden'>
             <div className='bg-blue-600 text-white p-4'><h2 className='text-lg font-bold'>Update Treatment & Meds</h2></div>
             <form onSubmit={handleAddTreatment} className='p-6 space-y-4'>
                <p className='text-sm text-gray-500 mb-2'>Patient Bed: <b>{selectedPatient.bedNumber}</b></p>
                <div>
                   <label className='block text-sm font-semibold mb-1'>Add Medicine (Optional)</label>
                   <div className='grid grid-cols-3 gap-2'>
                     <input placeholder='Name (e.g. Paracetamol)' value={medName} onChange={e => setMedName(e.target.value)} className='col-span-1 border p-2 rounded text-sm'/>
                     <input placeholder='Dose (e.g. 500mg)' value={medDose} onChange={e => setMedDose(e.target.value)} className='col-span-1 border p-2 rounded text-sm'/>
                     <input placeholder='Timing (e.g. 1-0-1)' value={medTiming} onChange={e => setMedTiming(e.target.value)} className='col-span-1 border p-2 rounded text-sm'/>
                   </div>
                </div>
                <div>
                   <label className='block text-sm font-semibold mb-1'>Doctor Notes</label>
                   <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder='Any progress or changes in condition...' className='w-full border p-2 rounded text-sm'></textarea>
                </div>
                <div className='flex justify-end gap-3 mt-4'>
                   <button type='button' onClick={() => setModalType('')} className='px-4 py-2 border rounded text-gray-600 hover:bg-gray-50'>Cancel</button>
                   <button type='submit' className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'>Save Update</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* DISCHARGE & BILLING MODAL */}
      {modalType === 'discharge' && selectedPatient && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4'>
           <div className='bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden'>
             <div className='bg-green-600 text-white p-4'><h2 className='text-lg font-bold'>Generate Bill & Discharge</h2></div>
             <form onSubmit={handleDischarge} className='p-6 space-y-4'>
                <div className='bg-green-50 p-3 rounded text-sm border border-green-100 text-green-800 mb-4'>
                  Days Admitted: <b>{Math.max(1, Math.ceil((Date.now() - selectedPatient.admission_date) / (1000 * 60 * 60 * 24)))}</b><br/>
                  Bed: <b>{selectedPatient.bedNumber} ({selectedPatient.wardType})</b>
                </div>

                <div>
                   <label className='block text-sm font-semibold mb-1'>Doctor Fees ({currency})</label>
                   <input required type='number' min="0" value={doctorFees} onChange={e => setDoctorFees(e.target.value)} className='w-full border p-2 rounded text-sm bg-gray-50'/>
                </div>
                <div>
                   <label className='block text-sm font-semibold mb-1'>Lab / Test Charges ({currency})</label>
                   <input required type='number' min="0" value={testCharges} onChange={e => setTestCharges(e.target.value)} className='w-full border p-2 rounded text-sm bg-gray-50'/>
                </div>
                <div>
                   <label className='block text-sm font-semibold mb-1'>Medicines Total ({currency})</label>
                   <input required type='number' min="0" value={medicinesTotal} onChange={e => setMedicinesTotal(e.target.value)} className='w-full border p-2 rounded text-sm bg-gray-50'/>
                </div>
                
                <p className='text-xs text-gray-400 italic mt-2'>*Room charges will be calculated automatically upon discharge based on the assigned bed's daily rate.</p>

                <div className='flex justify-end gap-3 mt-6 pt-4 border-t'>
                   <button type='button' onClick={() => setModalType('')} className='px-4 py-2 border rounded text-gray-600 hover:bg-gray-50'>Cancel</button>
                   <button type='submit' className='px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 shadow-md'>Discharge Patient</button>
                </div>
             </form>
           </div>
        </div>
      )}

    </div>
  )
}

export default Inpatients
