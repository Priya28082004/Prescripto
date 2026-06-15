import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets'
import { NavLink } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import { Menu } from 'lucide-react'

const Sidebar = () => {
  const { dToken } = useContext(DoctorContext)
  const { aToken } = useContext(AdminContext)
  
  // Collapse state initialized from localStorage for persistence
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('admin_sidebar_collapsed') === 'true'
  )

  const toggleSidebar = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('admin_sidebar_collapsed', String(nextState))
  }

  // Dynamic class generator for NavLink elements
  const linkClass = (isActive) => {
    return `flex items-center gap-3 py-3.5 cursor-pointer transition-all duration-300 ${
      isCollapsed 
        ? 'px-0 justify-center w-full' 
        : 'px-3 md:px-9 md:min-w-72'
    } ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-semibold' : 'text-[#515151]'}`
  }

  return (
    <div className={`min-h-screen bg-white border-r transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-16 md:w-20' : 'w-64 md:min-w-72'
    }`}>
      {/* Sleek Hamburger toggle button header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-gray-100`}>
        {!isCollapsed && (
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-fade-in">
            Control Panel
          </span>
        )}
        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition duration-200"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {aToken && <ul className="mt-5 space-y-1">
        <NavLink to={'/admin-dashboard'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.home_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Dashboard</p>
        </NavLink>
        <NavLink to={'/all-appointments'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.appointment_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Appointments</p>
        </NavLink>
        <NavLink to={'/add-doctor'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.add_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Add Doctor</p>
        </NavLink>
        <NavLink to={'/doctor-list'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.people_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Doctors List</p>
        </NavLink>
        <NavLink to={'/inpatients'} className={({ isActive }) => linkClass(isActive)}>
          <div className='min-w-5 w-5 text-lg text-center flex items-center justify-center'>🛏️</div>
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Inpatients</p>
        </NavLink>
        <NavLink to={'/unified-inbox'} className={({ isActive }) => linkClass(isActive)}>
          <div className='min-w-5 w-5 text-lg text-center flex items-center justify-center'>📥</div>
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Unified Inbox</p>
        </NavLink>
        <NavLink to={'/support-stats'} className={({ isActive }) => linkClass(isActive)}>
          <div className='min-w-5 w-5 text-lg text-center flex items-center justify-center'>📊</div>
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Support Stats</p>
        </NavLink>
        <NavLink to={'/billing-records'} className={({ isActive }) => linkClass(isActive)}>
          <div className='min-w-5 w-5 text-lg text-center flex items-center justify-center'>🧾</div>
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Billing & Invoices</p>
        </NavLink>
      </ul>}

      {dToken && <ul className="mt-5 space-y-1">
        <NavLink to={'/doctor-dashboard'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.home_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Dashboard</p>
        </NavLink>
        <NavLink to={'/doctor-appointments'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.appointment_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Appointments</p>
        </NavLink>
        <NavLink to={'/doctor-profile'} className={({ isActive }) => linkClass(isActive)}>
          <img className='min-w-5 w-5 h-5' src={assets.people_icon} alt='' />
          <p className={`${isCollapsed ? 'hidden' : 'hidden md:block'} whitespace-nowrap`}>Profile</p>
        </NavLink>
      </ul>}
    </div>
  )
}

export default Sidebar