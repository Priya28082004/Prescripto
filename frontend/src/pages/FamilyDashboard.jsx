import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const FamilyDashboard = () => {

  const { backendUrl, familyToken, setFamilyToken } = useContext(AppContext)
  const navigate = useNavigate()

  const [patientData, setPatientData] = useState(null)
  
  const fetchPatientStatus = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/family/patient-status', { headers: { token: familyToken } })
      if (data.success) {
        setPatientData(data)
      } else {
        toast.error(data.message)
        if (data.message === "Family not found") {
            setFamilyToken('')
            localStorage.removeItem('familyToken')
            navigate('/family-login')
        }
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (familyToken) {
      fetchPatientStatus()
    } else {
      navigate('/family-login')
    }
  }, [familyToken])

  const logoutFamily = () => {
    localStorage.removeItem('familyToken')
    setFamilyToken('')
    navigate('/family-login')
  }

  if (!patientData) return <div className='p-10 text-center text-gray-500'>Loading Patient Data...</div>

  return (
    <div className='p-5 sm:p-10 min-h-screen bg-gray-50'>
      <div className='flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border'>
         <h1 className='text-2xl font-bold text-gray-800 flex items-center gap-3'>
            👨‍👩‍👧‍👦 Family View: <span className='text-primary'>{patientData.patient?.name}</span>
         </h1>
         <button onClick={logoutFamily} className='bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition'>Logout</button>
      </div>

      {patientData.admitted ? (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          
          {/* Left Column: Admission info */}
          <div className='lg:col-span-1 bg-white shadow-md rounded-xl p-6 border-t-4 border-primary'>
            <h2 className='text-xl font-semibold mb-4 text-gray-800 border-b pb-2'>Current Admission Details</h2>
            <div className='space-y-4'>
               <div>
                  <p className='text-sm text-gray-500'>Problem / Diagnosis</p>
                  <p className='font-medium text-gray-800'>{patientData.admission.problem_description}</p>
               </div>
               <div>
                  <p className='text-sm text-gray-500'>Required Checkups</p>
                  <ul className='list-disc pl-5 mt-1'>
                    {patientData.admission.required_checkups.length > 0 
                      ? patientData.admission.required_checkups.map((ck, i) => <li key={i} className='font-medium text-gray-800'>{ck}</li>)
                      : <li className='text-gray-500 italic'>None listed</li>}
                  </ul>
               </div>
               <div>
                  <p className='text-sm text-gray-500'>Admitted On</p>
                  <p className='font-medium text-gray-800'>{new Date(patientData.admission.admission_date).toLocaleString()}</p>
               </div>
            </div>
          </div>

          {/* Right Column: Health Timeline */}
          <div className='lg:col-span-2 bg-white shadow-md rounded-xl p-6 border'>
            <h2 className='text-xl font-semibold mb-6 flex items-center gap-2'>
              📈 Daily Health Timeline
            </h2>
            
            {patientData.timeline && patientData.timeline.length > 0 ? (
               <div className='relative border-l-2 border-green-200 ml-3 space-y-8'>
                  {patientData.timeline.map((update, idx) => (
                    <div key={idx} className='relative pl-6'>
                       {/* Timeline dot */}
                       <div className='absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white'></div>
                       
                       <div className='bg-gray-50 rounded-lg p-4 border shadow-sm'>
                          <p className='text-xs font-bold text-gray-500 mb-2'>{new Date(update.date).toLocaleString()}</p>
                          <div className='grid grid-cols-3 gap-4 mb-3'>
                            <div className='bg-blue-50 p-2 rounded'>
                               <span className='block text-xs text-blue-500 mb-1'>Blood Pressure</span>
                               <span className='font-semibold'>{update.bp}</span>
                            </div>
                            <div className='bg-red-50 p-2 rounded'>
                               <span className='block text-xs text-red-500 mb-1'>Heart Rate</span>
                               <span className='font-semibold'>{update.heart_rate} bpm</span>
                            </div>
                            <div className='bg-orange-50 p-2 rounded'>
                               <span className='block text-xs text-orange-500 mb-1'>Temperature</span>
                               <span className='font-semibold'>{update.temperature}</span>
                            </div>
                          </div>
                          {update.notes && (
                            <div className='mt-3 pt-3 border-t text-sm text-gray-700 bg-white p-3 rounded'>
                              <span className='font-semibold mr-2'>Nurse Notes:</span> {update.notes}
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className='text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300'>
                 <p className='text-gray-500'>No daily updates have been recorded yet.</p>
               </div>
            )}
          </div>

        </div>
      ) : (
        <div className='bg-green-50 border border-green-200 text-green-800 p-8 rounded-xl shadow-sm text-center'>
            <h2 className='text-2xl font-semibold mb-2'>Patient is Safe at Home</h2>
            <p className='text-lg'>There are no active hospital admissions for {patientData.patient?.name}.</p>
        </div>
      )}
    </div>
  )
}

export default FamilyDashboard
