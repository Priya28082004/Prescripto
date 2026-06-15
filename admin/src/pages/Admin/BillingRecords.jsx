import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { Printer, Download, Plus, CheckCircle, Clock, ShieldCheck, CreditCard, Banknote } from 'lucide-react'

const BillingRecords = () => {
    const { aToken, backendUrl } = useContext(AdminContext)
    const { slotDateFormat, currencySymbol } = useContext(AppContext)

    const [bills, setBills] = useState([])
    const [loading, setLoading] = useState(true)
    
    // Stats states
    const [stats, setStats] = useState({
        totalBilled: 0,
        totalCollected: 0,
        pendingBilled: 0,
        cashCollected: 0,
        cardCollected: 0,
        insuranceCollected: 0
    })

    // Invoice View Modal state
    const [selectedBill, setSelectedBill] = useState(null)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)

    // Fetch all billing records
    const fetchBillingRecords = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get(backendUrl + '/api/billing/all', { headers: { atoken: aToken } })
            if (data.success) {
                setBills(data.bills)
                calculateStats(data.bills)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Calculate billing analytics
    const calculateStats = (billList) => {
        let total = 0
        let collected = 0
        let pending = 0
        let cash = 0
        let card = 0
        let insurance = 0

        billList.forEach(b => {
            total += b.total
            if (b.paymentStatus === 'Confirmed') {
                collected += b.total
                if (b.paymentMethod === 'Cash') cash += b.total
                else if (b.paymentMethod === 'Card/UPI') card += b.total
                else if (b.paymentMethod === 'Insurance') insurance += b.total
            } else {
                pending += b.total
            }
        })

        setStats({
            totalBilled: total,
            totalCollected: collected,
            pendingBilled: pending,
            cashCollected: cash,
            cardCollected: card,
            insuranceCollected: insurance
        })
    }

    // Confirm Payment Offline
    const confirmPaymentOffline = async (appointmentId, method) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/billing/confirm-payment', {
                appointmentId,
                paymentMethod: method,
                paymentStatus: 'Confirmed'
            })

            if (data.success) {
                toast.success(`Payment confirmed via ${method}`)
                fetchBillingRecords()
                if (selectedBill && selectedBill.appointmentId === appointmentId) {
                    setSelectedBill(prev => ({
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
            fetchBillingRecords()
        }
    }, [aToken])

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className='w-full max-w-6xl m-5 print:m-0'>
            {/* Custom Print Style */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-invoice-container, .print-invoice-container * {
                        visibility: visible;
                    }
                    .print-invoice-container {
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

            <div className='flex justify-between items-center mb-6 no-print'>
                <div>
                    <h2 className='text-2xl font-bold text-gray-800'>Billing Department Dashboard</h2>
                    <p className='text-gray-500 text-sm'>Manage patient bill calculations, confirm payments & download PDF reports.</p>
                </div>
                <button 
                    onClick={fetchBillingRecords} 
                    className='bg-primary text-white px-4 py-2 rounded-full text-xs font-semibold shadow hover:bg-opacity-90 transition'
                >
                    Refresh Records
                </button>
            </div>

            {/* Billing Stats Row */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 no-print'>
                <div className='bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between'>
                    <div>
                        <p className='text-indigo-100 text-sm font-semibold uppercase tracking-wider'>Total Bill Generated</p>
                        <p className='text-3xl font-extrabold mt-1'>{currencySymbol}{stats.totalBilled.toLocaleString()}</p>
                    </div>
                    <div className='flex items-center gap-2 mt-4 text-xs text-indigo-100'>
                        <ShieldCheck className='w-4 h-4' />
                        <span>Aggregated accounts receivable records</span>
                    </div>
                </div>

                <div className='bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between'>
                    <div>
                        <p className='text-emerald-100 text-sm font-semibold uppercase tracking-wider'>Total Payments Collected</p>
                        <p className='text-3xl font-extrabold mt-1'>{currencySymbol}{stats.totalCollected.toLocaleString()}</p>
                    </div>
                    <div className='flex gap-4 mt-4 text-xs text-emerald-100 border-t border-emerald-400 pt-3'>
                        <div className='flex items-center gap-1'>
                            <Banknote className='w-3.5 h-3.5' />
                            <span>Cash: {currencySymbol}{stats.cashCollected}</span>
                        </div>
                        <div className='flex items-center gap-1'>
                            <CreditCard className='w-3.5 h-3.5' />
                            <span>UPI: {currencySymbol}{stats.cardCollected}</span>
                        </div>
                    </div>
                </div>

                <div className='bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between'>
                    <div>
                        <p className='text-amber-100 text-sm font-semibold uppercase tracking-wider'>Outstanding Receivables</p>
                        <p className='text-3xl font-extrabold mt-1'>{currencySymbol}{stats.pendingBilled.toLocaleString()}</p>
                    </div>
                    <div className='flex items-center gap-2 mt-4 text-xs text-amber-100'>
                        <Clock className='w-4 h-4' />
                        <span>Awaiting insurance claim & cash closures</span>
                    </div>
                </div>
            </div>

            {/* Billing Records List */}
            <div className='bg-white border rounded-2xl shadow-sm text-sm overflow-hidden no-print'>
                <div className='bg-gray-50 border-b py-3 px-6 text-gray-700 font-semibold grid grid-cols-[1.2fr_2fr_2fr_1.5fr_1.2fr_1.5fr_1.5fr] max-md:grid-cols-[1fr_2fr_1fr]'>
                    <p>Invoice No</p>
                    <p>Patient Name</p>
                    <p className='max-md:hidden'>Consultant Doctor</p>
                    <p className='max-md:hidden'>Billing Date</p>
                    <p>Total</p>
                    <p className='max-md:hidden'>Payment Method</p>
                    <p className='text-right'>Action</p>
                </div>

                {loading ? (
                    <div className='text-center py-20 text-gray-500 font-medium'>
                        Loading billing history...
                    </div>
                ) : bills.length === 0 ? (
                    <div className='text-center py-20 text-gray-500 font-medium'>
                        No billing reports found. Completed consultations will be displayed here for invoice generation.
                    </div>
                ) : (
                    <div className='divide-y'>
                        {bills.map((item, index) => (
                            <div key={index} className='grid grid-cols-[1.2fr_2fr_2fr_1.5fr_1.2fr_1.5fr_1.5fr] max-md:grid-cols-[1fr_2fr_1fr] items-center py-4 px-6 text-gray-600 hover:bg-gray-50 transition'>
                                <p className='font-mono font-bold text-gray-800'>{item.invoiceNumber}</p>
                                <div className='flex items-center gap-2'>
                                    {item.patientData.image && <img className='w-7 h-7 rounded-full' src={item.patientData.image} alt="" />}
                                    <p className='font-medium text-gray-900'>{item.patientData.name}</p>
                                </div>
                                <p className='max-md:hidden'>{item.docData.name}</p>
                                <p className='max-md:hidden text-xs'>{new Date(item.billingDate).toLocaleDateString()} at {new Date(item.billingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className='font-bold text-gray-900'>{currencySymbol}{item.total}</p>
                                <p className='max-md:hidden'>
                                    {item.paymentStatus === 'Confirmed' ? (
                                        <span className='inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-semibold'>
                                            <CheckCircle className='w-3 h-3' />
                                            {item.paymentMethod}
                                        </span>
                                    ) : (
                                        <span className='inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-semibold'>
                                            <Clock className='w-3 h-3' />
                                            Pending
                                        </span>
                                    )}
                                </p>
                                <div className='flex justify-end gap-2'>
                                    <button 
                                        onClick={() => { setSelectedBill(item); setShowInvoiceModal(true); }}
                                        className='border border-primary text-primary px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-primary hover:text-white transition'
                                    >
                                        View Invoice
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Premium printable glassmorphic Invoice Modal */}
            {showInvoiceModal && selectedBill && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 no-print'>
                    <div className='bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'>
                        {/* Modal Header controls */}
                        <div className='bg-gray-50 border-b px-6 py-4 flex justify-between items-center no-print'>
                            <div className='flex items-center gap-2'>
                                <div className='w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse'></div>
                                <span className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Official Bill Receipt</span>
                            </div>
                            <div className='flex items-center gap-3'>
                                <button 
                                    onClick={handlePrint}
                                    className='flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-opacity-95 shadow transition'
                                >
                                    <Printer className='w-3.5 h-3.5' /> Print / Save PDF
                                </button>
                                <button 
                                    onClick={() => { setShowInvoiceModal(false); setSelectedBill(null); }}
                                    className='text-gray-400 hover:text-gray-600 text-lg font-bold'
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Invoice Content */}
                        <div className='p-8 overflow-y-auto flex-1 print-invoice-container bg-white'>
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
                                    <p className='text-sm font-mono font-bold text-gray-500 mt-1'>{selectedBill.invoiceNumber}</p>
                                    <p className='text-xs text-gray-400 mt-1'>Date: {new Date(selectedBill.billingDate).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Patient & Doctor metadata */}
                            <div className='grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl mb-6'>
                                <div>
                                    <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'>Billed To:</p>
                                    <p className='font-bold text-gray-800 text-sm'>{selectedBill.patientData.name}</p>
                                    <p className='text-xs text-gray-500 mt-0.5'>Date of Birth: {selectedBill.patientData.dob || 'N/A'}</p>
                                    <p className='text-xs text-gray-500'>Email: {selectedBill.patientData.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'>Provider Details:</p>
                                    <p className='font-bold text-gray-800 text-sm'>Dr. {selectedBill.docData.name}</p>
                                    <p className='text-xs text-gray-500 mt-0.5'>{selectedBill.docData.speciality}</p>
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
                                            <p className='text-right font-semibold'>{currencySymbol}{selectedBill.doctorFees}</p>
                                        </div>
                                        {selectedBill.testCharges > 0 && (
                                            <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                                                <p className='font-medium'>Diagnostic & Lab Tests (Added)</p>
                                                <p className='text-right font-semibold'>{currencySymbol}{selectedBill.testCharges}</p>
                                            </div>
                                        )}
                                        {selectedBill.medicineCharges > 0 && (
                                            <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                                                <p className='font-medium'>Prescribed Pharmacy & Medicines (Added)</p>
                                                <p className='text-right font-semibold'>{currencySymbol}{selectedBill.medicineCharges}</p>
                                            </div>
                                        )}
                                        {selectedBill.roomCharges > 0 && (
                                            <div className='grid grid-cols-[3fr_1.5fr] py-3.5 px-5'>
                                                <p className='font-medium'>Inpatient Ward & Bed Charges (Added)</p>
                                                <p className='text-right font-semibold'>{currencySymbol}{selectedBill.roomCharges}</p>
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
                                        {selectedBill.paymentStatus === 'Confirmed' ? (
                                            <>
                                                <div className='w-2 h-2 rounded-full bg-emerald-500'></div>
                                                <p className='text-xs font-bold text-emerald-600'>PAID ({selectedBill.paymentMethod})</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className='w-2 h-2 rounded-full bg-amber-500'></div>
                                                <p className='text-xs font-bold text-amber-600'>UNPAID (Awaiting Confirmation)</p>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Action to confirm offline cash/card payment if pending */}
                                    {selectedBill.paymentStatus !== 'Confirmed' && (
                                        <div className='mt-3 flex gap-2 no-print'>
                                            <button 
                                                onClick={() => confirmPaymentOffline(selectedBill.appointmentId, 'Cash')}
                                                className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1'
                                            >
                                                Confirm Cash
                                            </button>
                                            <button 
                                                onClick={() => confirmPaymentOffline(selectedBill.appointmentId, 'Card/UPI')}
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
                                        <span className='font-semibold text-gray-800'>{currencySymbol}{selectedBill.subtotal}</span>
                                    </div>
                                    {selectedBill.discount > 0 && (
                                        <div className='flex justify-between text-emerald-600'>
                                            <span>Hospital Discount</span>
                                            <span>-{currencySymbol}{selectedBill.discount}</span>
                                        </div>
                                    )}
                                    {selectedBill.tax > 0 && (
                                        <div className='flex justify-between'>
                                            <span>Medical Service Tax</span>
                                            <span className='font-semibold text-gray-800'>+{currencySymbol}{selectedBill.tax}</span>
                                        </div>
                                    )}
                                    <div className='flex justify-between border-t border-dashed pt-2.5 text-base text-gray-900 font-extrabold'>
                                        <span>Total Due</span>
                                        <span className='text-xl text-primary'>{currencySymbol}{selectedBill.total}</span>
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

export default BillingRecords
