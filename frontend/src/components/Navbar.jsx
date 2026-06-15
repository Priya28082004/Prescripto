import React, { useContext, useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const Navbar = () => {

  const navigate = useNavigate()

  const [showMenu, setShowMenu] = useState(false)
  const { token, setToken, userData } = useContext(AppContext)

  const [selectedLang, setSelectedLang] = useState('en')

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'bn', name: 'বাংলা (Bengali)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'ur', name: 'اردو (Urdu)' }
  ]

  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/i)
    if (match && match[1]) {
      setSelectedLang(match[1].toLowerCase())
    }
  }, [])

  useEffect(() => {
    const id = 'google-translate-script'
    if (!document.getElementById(id)) {
      const addScript = document.createElement('script')
      addScript.setAttribute('src', 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit')
      addScript.setAttribute('id', id)
      document.body.appendChild(addScript)
      
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,bn,te,ta,mr,gu,kn,ml,pa,ur',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element')
      }
    }
  }, [])

  const changeLanguage = (langCode) => {
    setSelectedLang(langCode)
    
    // Set googtrans cookie to persist selection across refreshes & components
    document.cookie = `googtrans=/en/${langCode}; path=/;`
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=localhost;`
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=.localhost;`
    
    const translateSelect = document.querySelector('#google_translate_element select')
    if (translateSelect) {
      translateSelect.value = langCode
      translateSelect.dispatchEvent(new Event('change'))
    } else {
      setTimeout(() => {
        const retrySelect = document.querySelector('#google_translate_element select')
        if (retrySelect) {
          retrySelect.value = langCode
          retrySelect.dispatchEvent(new Event('change'))
        }
      }, 500)
    }
    
    // Force reload to cleanly parse and translate the entire document tree
    window.location.reload()
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(false)
    navigate('/login')
  }

  return (
    <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-[#ADADAD]'>
      <img onClick={() => navigate('/')} className='w-44 cursor-pointer' src={assets.logo} alt="" />
      <ul className='md:flex items-start gap-5 font-medium hidden'>
        <NavLink to='/' >
          <li className='py-1'>HOME</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/doctors' >
          <li className='py-1'>ALL DOCTORS</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/about' >
          <li className='py-1'>ABOUT</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/contact' >
          <li className='py-1'>CONTACT</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
      </ul>

      <div className='flex items-center gap-4 '>
        {/* Sleek Language Switcher */}
        <div className="relative inline-block text-left mr-1">
          <select
            value={selectedLang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium hover:bg-gray-100 transition-all"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                🌐 {lang.name}
              </option>
            ))}
          </select>
        </div>

        {
          token && userData
            ? <div className='flex items-center gap-2 cursor-pointer group relative'>
              <img className='w-8 rounded-full' src={userData.image} alt="" />
              <img className='w-2.5' src={assets.dropdown_icon} alt="" />
              <div className='absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block'>
                <div className='min-w-48 bg-gray-50 rounded flex flex-col gap-4 p-4'>
                  <p onClick={() => navigate('/my-profile')} className='hover:text-black cursor-pointer'>My Profile</p>
                  <p onClick={() => navigate('/my-appointments')} className='hover:text-black cursor-pointer'>My Appointments</p>
                  <p onClick={() => navigate('/my-admissions')} className='hover:text-black cursor-pointer text-primary font-medium'>My Admissions</p>
                  <p onClick={() => navigate('/support-hub')} className='hover:text-black cursor-pointer text-indigo-600 font-medium'>Support Hub</p>
                  <p onClick={logout} className='hover:text-black cursor-pointer'>Logout</p>
                </div>
              </div>
            </div>
            : <button onClick={() => navigate('/login')} className='bg-primary text-white px-8 py-3 rounded-full font-light hidden md:block'>Create account</button>
        }
        
        {/* Nurse and Family Shortcuts */}
        <div className='hidden md:flex gap-2 ml-4'>
            <button onClick={() => navigate('/nurse-dashboard')} className='border border-blue-500 text-blue-500 hover:bg-blue-50 px-4 py-2 rounded-full text-xs font-medium transition'>Nurse Panel</button>
            <button onClick={() => navigate('/family-dashboard')} className='border border-green-500 text-green-500 hover:bg-green-50 px-4 py-2 rounded-full text-xs font-medium transition'>Family View</button>
        </div>

        <img onClick={() => setShowMenu(prev => !prev)} className='w-6 md:hidden' src={assets.menu_icon} alt="" />

        {/* ---- Mobile Menu ---- */}
        <div style={showMenu ? {position: 'fixed', inset: 0, width: '100%', height: '100%', backgroundColor: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column'} : {display: 'none'}}>
          <div className='flex items-center justify-between px-5 py-6'>
            <img src={assets.logo} className='w-36' alt="" />
            <img onClick={() => setShowMenu(false)} src={assets.cross_icon} className='w-7' alt="" />
          </div>
          <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium'>
            <NavLink onClick={() => setShowMenu(false)} to='/'><p className='px-4 py-2 rounded full inline-block'>HOME</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/doctors' ><p className='px-4 py-2 rounded full inline-block'>ALL DOCTORS</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/about' ><p className='px-4 py-2 rounded full inline-block'>ABOUT</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/contact' ><p className='px-4 py-2 rounded full inline-block'>CONTACT</p></NavLink>
            {token && <NavLink onClick={() => setShowMenu(false)} to='/support-hub'><p className='px-4 py-2 rounded full inline-block text-indigo-600 font-semibold'>SUPPORT HUB</p></NavLink>}
          </ul>
        </div>
      </div>
      
      {/* Hidden google translate initialization element */}
      <div id="google_translate_element" style={{ display: 'none', visibility: 'hidden', height: 0, width: 0 }}></div>
    </div>
  )
}

export default Navbar