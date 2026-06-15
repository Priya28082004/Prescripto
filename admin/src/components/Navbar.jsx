import React, { useContext, useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import { useNavigate } from 'react-router-dom'

const Navbar = () => {

  const { dToken, setDToken } = useContext(DoctorContext)
  const { aToken, setAToken } = useContext(AdminContext)

  const navigate = useNavigate()

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
    } else {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        try {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,hi,bn,te,ta,mr,gu,kn,ml,pa,ur',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element')
        } catch (e) {
          console.warn("Translate element already active or failed init:", e)
        }
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
    navigate('/')
    dToken && setDToken('')
    dToken && localStorage.removeItem('dToken')
    aToken && setAToken('')
    aToken && localStorage.removeItem('aToken')
  }

  return (
    <div className='flex justify-between items-center px-4 sm:px-10 py-3 border-b bg-white'>
      <div className='flex items-center gap-2 text-xs'>
        <img onClick={() => navigate('/')} className='w-36 sm:w-40 cursor-pointer' src={assets.admin_logo} alt="" />
        <p className='border px-2.5 py-0.5 rounded-full border-gray-500 text-gray-600'>{aToken ? 'Admin' : 'Doctor'}</p>
      </div>
      
      <div className='flex items-center gap-4'>
        {/* Sleek Language Switcher */}
        <div className="relative inline-block text-left">
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

        <button onClick={() => logout()} className='bg-primary text-white text-sm px-10 py-2 rounded-full'>Logout</button>
      </div>

      {/* Hidden google translate initialization element */}
      <div id="google_translate_element" style={{ display: 'none', visibility: 'hidden', height: 0, width: 0 }}></div>
    </div>
  )
}

export default Navbar