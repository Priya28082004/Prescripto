import React, { useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'

const MyAdmissions = () => {
  const { token, myAdmissions, getMyAdmissions, currency } = useContext(AppContext)

  useEffect(() => {
    if (token) {
      getMyAdmissions()
    }
  }, [token])

  const handlePrint = () => {
    window.print();
  }

  return (
    <div>
      <p className='pb-3 mt-12 font-medium text-zinc-700 border-b'>My Hospital Admissions</p>
      <div className='flex flex-col gap-6 sm:gap-8 mt-5'>
        {myAdmissions.length === 0 && <p className='text-gray-500'>No past or active admissions found.</p>}
        
        {myAdmissions.map((adm, index) => (
          <div key={index} className='border rounded-lg shadow-sm p-5 bg-white'>
            <div className='flex justify-between border-b pb-3 mb-3 shrink-0 print-header'>
              <div>
                <h2 className='text-lg font-semibold text-primary'>Admission: {new Date(adm.admission_date).toLocaleDateString()}</h2>
                <p className='text-sm text-gray-500'>ID: {adm._id}</p>
                <p className='text-sm font-medium mt-1'>Status: <span className={adm.status === "Discharged" ? "text-green-600" : "text-blue-600"}>{adm.status}</span></p>
                {adm.status === "Discharged" && <p className='text-xs text-gray-500'>Discharged on: {new Date(adm.discharge_date).toLocaleDateString()}</p>}
              </div>
              <div className='text-right'>
                <p className='text-sm font-medium'>Ward: {adm.wardType}</p>
                <p className='text-sm font-medium'>Bed: {adm.bedNumber}</p>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
               <div>
                  <h3 className='font-semibold mb-2'>Diagnosis & Treatment</h3>
                  <p className='text-sm text-gray-700 bg-blue-50 p-3 rounded mb-2'><b>Problem:</b> {adm.problem_description}</p>
                  
                  {adm.severityLevel && (
                    <p className='text-sm mb-2'>
                        <span className='font-semibold'>Severity Level:</span> 
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs text-white ${adm.severityLevel === 'Critical' ? 'bg-red-500' : adm.severityLevel === 'Serious' ? 'bg-orange-500' : 'bg-green-500'}`}>
                            {adm.severityLevel}
                        </span>
                    </p>
                  )}

                  {adm.required_checkups && adm.required_checkups.length > 0 && (
                    <div className='mt-3 mb-2'>
                        <p className='font-semibold text-sm'>Required Tests / Checkups:</p>
                        <p className='text-sm text-gray-600'>{adm.required_checkups.join(', ')}</p>
                    </div>
                  )}
                  
                  {adm.medicines && adm.medicines.length > 0 && (
                    <div className='mt-3'>
                      <p className='font-semibold text-sm'>Medicines prescribed:</p>
                      <ul className='list-disc pl-5 text-sm text-gray-600'>
                         {adm.medicines.map((med, i) => (
                           <li key={i}>{med.name} ({med.dose}) - {med.timing}</li>
                         ))}
                      </ul>
                    </div>
                  )}

                  {adm.treatment_notes && (
                     <div className='mt-3'>
                        <p className='font-semibold text-sm'>Doctor Notes:</p>
                        <p className='text-sm text-gray-600 whitespace-pre-wrap border-l-2 border-gray-300 pl-2'>{adm.treatment_notes}</p>
                     </div>
                  )}
               </div>

               <div>
                  <h3 className='font-semibold mb-2 border-b pb-1'>Billing Details</h3>
                  {adm.billing && adm.billing.totalAmount > 0 ? (
                    <div className='bg-gray-50 p-4 rounded text-sm'>
                       <div className='flex justify-between mb-1'><p>Room Charges:</p><p>{currency}{adm.billing.roomCharges}</p></div>
                       <div className='flex justify-between mb-1'><p>Doctor Fees:</p><p>{currency}{adm.billing.doctorFees}</p></div>
                       <div className='flex justify-between mb-1'><p>Medicines Total:</p><p>{currency}{adm.billing.medicinesTotal}</p></div>
                       <div className='flex justify-between mb-1 border-b pb-2'><p>Lab Tests:</p><p>{currency}{adm.billing.testCharges}</p></div>
                       <div className='flex justify-between font-bold text-lg pt-2 mt-2'><p>Total Billed:</p><p className='text-primary'>{currency}{adm.billing.totalAmount}</p></div>
                       <div className='flex items-center gap-2 mt-3 text-xs'>
                          <span className={`px-2 py-1 rounded ${adm.billing.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {adm.billing.isPaid ? "Paid in full" : "Payment Pending"}
                          </span>
                       </div>
                    </div>
                  ) : (
                    <p className='text-sm text-gray-500 italic'>Billing is generated dynamically upon discharge.</p>
                  )}
                  
                  {adm.status === "Discharged" && (
                    <div className='mt-4'>
                       <h3 className='font-semibold mb-1 text-sm'>Discharge Summary:</h3>
                       <p className='text-sm text-gray-700 bg-green-50 p-3 rounded'>{adm.discharge_summary}</p>
                       <button onClick={handlePrint} className='mt-4 px-4 py-2 bg-primary text-white rounded text-sm hover:opacity-90 transition'>Download / Print Summary</button>
                    </div>
                  )}
               </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

export default MyAdmissions
