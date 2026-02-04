import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Register(){
  const [username,setUsername]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState(null)
  const nav = useNavigate()

  const submit = async (e)=>{
    e.preventDefault()
    const res = await api.register({ username, email, password, confirmPassword: password })
    if (res && res.success) return nav('/catalog')
    setError(res && res.error ? res.error : 'Error al registrar')
  }

  return (
    <div className="auth">
      <h2>Registrarse</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <input placeholder="Usuario" value={username} onChange={e=>setUsername(e.target.value)} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button>Crear cuenta</button>
      </form>
    </div>
  )
}
