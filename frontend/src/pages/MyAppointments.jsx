import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { Printer, Download, CreditCard, Banknote, Clock, CheckCircle } from 'lucide-react'

const MyAppointments = () => {

    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')

    // Billing States
    const [viewBillModalOpen, setViewBillModalOpen] = useState(false)
    const [activeBill, setActiveBill] = useState(null)

    const fetchBillForAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/billing/appointment/${appointmentId}`)
            if (data.success && data.billing) {
                setActiveBill(data.billing)
                setViewBillModalOpen(true)
            } else {
                toast.info("Invoice is being calculated. Please check back shortly or consult the reception.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to load invoice details.")
        }
    }

    const payInvoiceOnline = async (appointmentId, method) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/billing/confirm-payment', {
                appointmentId,
                paymentMethod: method,
                paymentStatus: 'Confirmed'
            })

            if (data.success) {
                toast.success(`Payment successful via ${method}!`)
                // Refresh billing details
                if (activeBill && activeBill.appointmentId === appointmentId) {
                    setActiveBill(prev => ({
                        ...prev,
                        paymentStatus: 'Confirmed',
                        paymentMethod: method
                    }))
                }
                getUserAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    }

    // Getting User Appointments Data Using API
    const getUserAppointments = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            setAppointments(data.appointments.reverse())

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to cancel appointment Using API
    const cancelAppointment = async (appointmentId) => {

        try {

            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    const initPay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {

                console.log(response)

                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } });
                    if (data.success) {
                        navigate('/my-appointments')
                        getUserAppointments()
                    }
                } catch (error) {
                    console.log(error)
                    toast.error(error.message)
                }
            }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    // Function to make payment using razorpay
    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) {
                initPay(data.order)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to make payment using stripe
    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                const { session_url } = data
                window.location.replace(session_url)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }



    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    return (
        <div>
            <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>
            <div className=''>
                {appointments.map((item, index) => (
                    <div key={index} className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b'>
                        <div>
                            <img className='w-36 bg-[#EAEFFF]' src={item.docData.image} alt="" />
                        </div>
                        <div className='flex-1 text-sm text-[#5E5E5E]'>
                            <p className='text-[#262626] text-base font-semibold'>{item.docData.name}</p>
                            <p>{item.docData.speciality}</p>
                            <p className='text-[#464646] font-medium mt-1'>Address:</p>
                            <p className=''>{item.docData.address.line1}</p>
                            <p className=''>{item.docData.address.line2}</p>
                            <p className=' mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} |  {item.slotTime}</p>
                            
                            {/* NEW FEATURES DISPLAY */}
                            <div className='mt-3 space-y-2'>
                                {item.status && item.status !== 'Waiting' && (
                                    <p><span className='text-sm text-primary font-medium'>Status:</span> {item.status}</p>
                                )}
                                {item.admitReason && (
                                    <p><span className='text-sm text-red-500 font-medium'>Admit Reason:</span> {item.admitReason}</p>
                                )}
                                {item.preAdmitAdvice && item.preAdmitAdvice.length > 0 && (
                                    <div className='bg-blue-50 p-3 rounded text-xs text-blue-800 border border-blue-100'>
                                        <p className='font-semibold mb-1'>Pre-Admit Advice:</p>
                                        {item.preAdmitAdvice[0].medicines && <p><span className='font-medium'>Medicines:</span> {item.preAdmitAdvice[0].medicines}</p>}
                                        {item.preAdmitAdvice[0].tests && <p><span className='font-medium'>Tests:</span> {item.preAdmitAdvice[0].tests}</p>}
                                        {item.preAdmitAdvice[0].advice && <p><span className='font-medium'>Advice:</span> {item.preAdmitAdvice[0].advice}</p>}
                                    </div>
                                )}
                                {item.doctorNotes && (
                                    <div className='bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100'>
                                        <p><span className='font-medium'>Doctor Notes:</span> {item.doctorNotes}</p>
                                    </div>
                                )}
                                {item.followUpDate && (
                                    <p><span className='text-sm text-green-600 font-medium'>Next Visit / Follow-Up:</span> {item.followUpDate}</p>
                                )}
                            </div>
                        </div>
                        <div></div>
                        <div className='flex flex-col gap-2 justify-end text-sm text-center'>
                            {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && <button onClick={() => setPayment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>}
                            {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentStripe(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.stripe_logo} alt="" /></button>}
                            {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" /></button>}
                            {!item.cancelled && item.payment && !item.isCompleted && <button className='sm:min-w-48 py-2 border rounded text-[#696969]  bg-[#EAEFFF]'>Paid</button>}

                            {item.isCompleted && (
                                <div className='flex flex-col gap-2'>
                                    <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500 cursor-default'>Completed</button>
                                    <button onClick={() => fetchBillForAppointment(item._id)} className='sm:min-w-48 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-semibold transition-all duration-300 shadow-sm'>View Bill / Invoice</button>
                                </div>
                            )}

                            {!item.cancelled && !item.isCompleted && <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>}
                            {item.cancelled && !item.isCompleted && <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Premium printable glassmorphic Invoice Modal for Patients */}
            {viewBillModalOpen && activeBill && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 backdrop-blur-xs p-4 no-print'>
                    {/* Custom Print Style for perfect vector PDF rendering */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            .print-invoice-section, .print-invoice-section * {
                                visibility: visible;
                            }
                            .print-invoice-section {
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
                        {/* Modal Header controls */}
                        <div className='bg-gray-50 border-b px-6 py-4 flex justify-between items-center no-print'>
                            <div className='flex items-center gap-2'>
                                <div className='w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse'></div>
                                <span className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Your Digital Invoice</span>
                            </div>
                            <div className='flex items-center gap-3'>
                                <button 
                                    onClick={() => window.print()}
                                    className='flex items-center gap-1 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-opacity-95 shadow transition'
                                >
                                    <Printer className='w-3.5 h-3.5' /> Download / Print PDF
                                </button>
                                <button 
                                    onClick={() => { setViewBillModalOpen(false); setActiveBill(null); }}
                                    className='text-gray-400 hover:text-gray-600 text-lg font-bold'
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Invoice Content */}
                        <div className='p-8 overflow-y-auto flex-1 print-invoice-section bg-white'>
                            {/* Hospital Details */}
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

                            {/* Patient & Doctor metadata */}
                            <div className='grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl mb-6'>
                                <div>
                                    <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'>Billed To:</p>
                                    <p className='font-bold text-gray-800 text-sm'>{activeBill.patientData ? activeBill.patientData.name : 'N/A'}</p>
                                    <p className='text-xs text-gray-500 mt-0.5'>Date of Birth: {activeBill.patientData ? activeBill.patientData.dob : 'N/A'}</p>
                                    <p className='text-xs text-gray-500'>Email: {activeBill.patientData ? activeBill.patientData.email : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'>Provider Details:</p>
                                    <p className='font-bold text-gray-800 text-sm'>Dr. {activeBill.docData ? activeBill.docData.name : 'N/A'}</p>
                                    <p className='text-xs text-gray-500 mt-0.5'>{activeBill.docData ? activeBill.docData.speciality : 'N/A'}</p>
                                    <p className='text-xs text-gray-500'>Department: Clinical Services</p>
                                </div>
                            </div>

                            {/* Itemized charges table */}
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
                                            <p className='text-right font-semibold'>₹{activeBill.doctorFees}</p>
                                        </div>
                                        {activeBill.testCharges > 0 && (
                                            <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                                                <p className='font-medium'>Diagnostic & Lab Tests (Added)</p>
                                                <p className='text-right font-semibold'>₹{activeBill.testCharges}</p>
                                            </div>
                                        )}
                                        {activeBill.medicineCharges > 0 && (
                                            <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                                                <p className='font-medium'>Prescribed Pharmacy & Medicines (Added)</p>
                                                <p className='text-right font-semibold'>₹{activeBill.medicineCharges}</p>
                                            </div>
                                        )}
                                        {activeBill.roomCharges > 0 && (
                                            <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                                                <p className='font-medium'>Inpatient Ward & Bed Charges (Added)</p>
                                                <p className='text-right font-semibold'>₹{activeBill.roomCharges}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Subtotal, tax, discounts, & final total */}
                            <div className='flex justify-between items-start border-t pt-6'>
                                <div>
                                    <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5'>Payment Details</p>
                                    <div className='flex items-center gap-1.5'>
                                        {activeBill.paymentStatus === 'Confirmed' ? (
                                            <>
                                                <div className='w-2 h-2 rounded-full bg-emerald-500'></div>
                                                <p className='text-xs font-bold text-emerald-600 uppercase font-sans'>PAID ({activeBill.paymentMethod})</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className='w-2 h-2 rounded-full bg-amber-500 animate-pulse'></div>
                                                <p className='text-xs font-bold text-amber-600 uppercase font-sans'>UNPAID (Pending Clearance)</p>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Action to make online simulated payment */}
                                    {activeBill.paymentStatus !== 'Confirmed' && (
                                        <div className='mt-4 space-y-2 no-print'>
                                            <p className='text-xs font-bold text-gray-500'>Select Payment Option:</p>
                                            <div className='flex gap-2'>
                                                <button 
                                                    onClick={() => payInvoiceOnline(activeBill.appointmentId, 'Card/UPI')}
                                                    className='bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition flex items-center gap-1'
                                                >
                                                    <CreditCard className='w-3.5 h-3.5' /> Pay via Card/UPI
                                                </button>
                                                <button 
                                                    onClick={() => payInvoiceOnline(activeBill.appointmentId, 'Insurance')}
                                                    className='bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition flex items-center gap-1'
                                                >
                                                    Insurance Claim
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className='w-64 space-y-2 text-sm text-gray-600'>
                                    <div className='flex justify-between'>
                                        <span>Subtotal</span>
                                        <span className='font-semibold text-gray-800'>₹{activeBill.subtotal}</span>
                                    </div>
                                    {activeBill.discount > 0 && (
                                        <div className='flex justify-between text-emerald-600'>
                                            <span>Discount</span>
                                            <span>-₹{activeBill.discount}</span>
                                        </div>
                                    )}
                                    {activeBill.tax > 0 && (
                                        <div className='flex justify-between'>
                                            <span>Service Tax</span>
                                            <span className='font-semibold text-gray-800'>+₹{activeBill.tax}</span>
                                        </div>
                                    )}
                                    <div className='flex justify-between border-t border-dashed pt-2.5 text-base text-gray-900 font-extrabold'>
                                        <span>Total Amount</span>
                                        <span className='text-xl text-primary font-sans'>₹{activeBill.total}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Receipt Footer terms */}
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

export default MyAppointments