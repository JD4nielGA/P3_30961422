import React, { createContext, useState, useEffect } from 'react'
import api from '../api'

export const AuthContext = createContext({ token: null, user: null })

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch(e){ return null }
  })

  useEffect(() => {
    if (token) localStorage.setItem('token', token); else localStorage.removeItem('token');
  }, [token])
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
  }, [user])

  const login = async (email, password) => {
    const res = await api.login({ email, password })
    if (res && res.token) {
      setToken(res.token); setUser(res.user || null); return { success: true }
    }
    return { success: false, error: res.error || 'Login failed' }
  }

  const register = async (payload) => {
    const res = await api.register(payload)
    if (res && res.token) { setToken(res.token); setUser(res.user || null); return { success: true } }
    return { success: false, error: res.error || 'Register failed' }
  }

  const logout = () => { setToken(null); setUser(null); }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
