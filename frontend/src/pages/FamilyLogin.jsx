import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const FamilyLogin = () => {

  const [state, setState] = useState('Login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [relation, setRelation] = useState('')

  const navigate = useNavigate()
  const { backendUrl, familyToken, setFamilyToken } = useContext(AppContext)

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
      if (state === 'Sign Up') {
        const { data } = await axios.post(backendUrl + '/api/family/register', { name, email, password, patientEmail, relation })
        if (data.success) {
          localStorage.setItem('familyToken', data.token)
          setFamilyToken(data.token)
        } else {
          toast.error(data.message)
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/family/login', { email, password })
        if (data.success) {
          localStorage.setItem('familyToken', data.token)
          setFamilyToken(data.token)
        } else {
          toast.error(data.message)
        }
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (familyToken) {
      navigate('/family-dashboard')
    }
  }, [familyToken])

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>Family {state === 'Sign Up' ? 'Register' : 'Login'}</p>
        <p>Please {state === 'Sign Up' ? 'sign up' : 'log in'} to view patient records</p>
        
        {state === 'Sign Up' && (
          <>
            <div className='w-full'>
              <p>Full Name</p>
              <input onChange={(e) => setName(e.target.value)} value={name} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="text" required />
            </div>
            <div className='w-full'>
              <p>Patient Email</p>
              <input onChange={(e) => setPatientEmail(e.target.value)} value={patientEmail} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
            </div>
            <div className='w-full'>
              <p>Relation to Patient</p>
              <input onChange={(e) => setRelation(e.target.value)} value={relation} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="text" required />
            </div>
          </>
        )}
        
        <div className='w-full '>
          <p>Your Email</p>
          <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
        </div>
        <div className='w-full '>
          <p>Password</p>
          <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
        </div>
        <button className='bg-primary text-white w-full py-2 my-2 rounded-md text-base'>{state === 'Sign Up' ? 'Register' : 'Login'}</button>
        
        {state === 'Sign Up'
          ? <p>Already registered? <span onClick={() => setState('Login')} className='text-primary underline cursor-pointer'>Login here</span></p>
          : <p>Want to track your family member? <span onClick={() => setState('Sign Up')} className='text-primary underline cursor-pointer'>Click here</span></p>
        }
      </div>
    </form>
  )
}

export default FamilyLogin
