import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const NurseDashboard = () => {

  const { backendUrl, nurseToken, setNurseToken } = useContext(AppContext)
  const navigate = useNavigate()

  const [admissions, setAdmissions] = useState([])
  const [selectedAdmission, setSelectedAdmission] = useState(null)
  
  // Vitals form
  const [bp, setBp] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [temperature, setTemperature] = useState('')
  const [notes, setNotes] = useState('')

  const fetchAdmissions = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/nurse/admissions', { headers: { token: nurseToken } })
      if (data.success) {
        setAdmissions(data.admissions)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (nurseToken) {
      fetchAdmissions()
    } else {
      navigate('/nurse-login')
    }
  }, [nurseToken])

  const submitUpdate = async (e) => {
    e.preventDefault()
    if (!selectedAdmission) return

    try {
      const { data } = await axios.post(backendUrl + '/api/nurse/daily-update', {
        admissionId: selectedAdmission._id,
        bp, heart_rate: heartRate, temperature, notes
      }, { headers: { token: nurseToken } })

      if (data.success) {
        toast.success(data.message)
        setSelectedAdmission(null)
        setBp(''); setHeartRate(''); setTemperature(''); setNotes('');
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const logoutNurse = () => {
    localStorage.removeItem('nurseToken')
    setNurseToken('')
    navigate('/nurse-login')
  }

  return (
    <div className='p-5 sm:p-10 min-h-screen'>
      <div className='flex justify-between items-center mb-8'>
         <h1 className='text-3xl font-bold text-gray-800'>Nurse Panel</h1>
         <button onClick={logoutNurse} className='bg-red-500 text-white px-4 py-2 rounded shadow'>Logout Nurse</button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {/* Left Column: Admissions List */}
        <div className='bg-white shadow rounded-lg p-6 border'>
          <h2 className='text-xl font-semibold mb-4'>Admitted Patients</h2>
          {admissions.length === 0 ? <p>No patients currently admitted.</p> : (
            <ul className='space-y-4'>
              {admissions.map(adm => (
                <li key={adm._id} className='p-4 border rounded hover:bg-gray-50 cursor-pointer transition' onClick={() => setSelectedAdmission(adm)}>
                  <p className='font-semibold text-primary'>Patient ID: {adm.patientId.slice(-6)}</p>
                  <div className='flex justify-between items-start mt-1'>
                      <p className='text-sm text-gray-600'>Problem: {adm.problem_description}</p>
                      {adm.severityLevel && (
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${adm.severityLevel === 'Critical' ? 'bg-red-500' : adm.severityLevel === 'Serious' ? 'bg-orange-500' : 'bg-green-500'}`}>
                              {adm.severityLevel}
                          </span>
                      )}
                  </div>
                  {adm.required_checkups && adm.required_checkups.length > 0 && (
                      <p className='text-xs text-blue-600 mt-1 font-medium'>Tests: {adm.required_checkups.join(', ')}</p>
                  )}
                  <p className='text-xs text-gray-500 mt-2'>Admitted On: {new Date(adm.admission_date).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Column: Update Form */}
        <div className='bg-white shadow rounded-lg p-6 border'>
          {selectedAdmission ? (
            <>
              <h2 className='text-xl font-semibold mb-4'>Add Daily Update</h2>
              <p className='text-sm mb-4 text-gray-500'>For Patient ID: {selectedAdmission.patientId.slice(-6)}</p>
              <form onSubmit={submitUpdate} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Blood Pressure (e.g. 120/80)</label>
                  <input type='text' required value={bp} onChange={e => setBp(e.target.value)} className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Heart Rate (bpm)</label>
                  <input type='text' required value={heartRate} onChange={e => setHeartRate(e.target.value)} className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Temperature (°F/°C)</label>
                  <input type='text' required value={temperature} onChange={e => setTemperature(e.target.value)} className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Additional Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2' rows={3} placeholder='Patient slept well, no pain reported...' />
                </div>
                <button type='submit' className='w-full bg-primary text-white py-2 px-4 rounded-md shadow hover:bg-opacity-90 transition'>Submit Vitals</button>
              </form>
            </>
          ) : (
             <div className='h-full flex items-center justify-center text-gray-400'>
               Select a patient from the list to add vitals.
             </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NurseDashboard
