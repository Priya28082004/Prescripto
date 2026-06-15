import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from 'axios'

export const AppContext = createContext()

const AppContextProvider = (props) => {

    const currencySymbol = '₹'
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [doctors, setDoctors] = useState([])
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '')
    const [nurseToken, setNurseToken] = useState(localStorage.getItem('nurseToken') ? localStorage.getItem('nurseToken') : '')
    const [familyToken, setFamilyToken] = useState(localStorage.getItem('familyToken') ? localStorage.getItem('familyToken') : '')
    const [userData, setUserData] = useState(false)
    const [myAdmissions, setMyAdmissions] = useState([])

    // Getting Doctors using API
    const getDoctosData = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/doctor/list')
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    // Getting User Profile using API
    const loadUserProfileData = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/user/get-profile', { headers: { token } })

            if (data.success) {
                setUserData(data.userData)
            } else {
                toast.error(data.message)
                setToken(false)
                localStorage.removeItem('token')
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    const getMyAdmissions = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/my-admissions', { headers: { token } })
            if (data.success) {
                setMyAdmissions(data.admissions)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    useEffect(() => {
        getDoctosData()
    }, [])

    useEffect(() => {
        if (token) {
            loadUserProfileData()
        }
    }, [token])

    const value = {
        doctors, getDoctosData,
        currencySymbol,
        backendUrl,
        token, setToken,
        nurseToken, setNurseToken,
        familyToken, setFamilyToken,
        userData, setUserData, loadUserProfileData,
        myAdmissions, setMyAdmissions, getMyAdmissions
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )

}

export default AppContextProvider