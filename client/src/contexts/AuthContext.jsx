import React, { createContext, useState, useEffect } from 'react'
import api from '../api'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      // optionally fetch user info from /api/auth/verify
      fetch('/api/auth/verify', { headers: { Authorization: 'Bearer ' + token } }).then(r=>r.json()).then(d=>{
        if (d && d.success) setUser(d.user || d);
      }).catch(()=>{});
    } else {
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [token])

  const login = async (payload) => {
    const res = await api.login(payload)
    if (res && res.token) {
      setToken(res.token)
      return { success: true }
    }
    return res
  }

  const logout = () => {
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
