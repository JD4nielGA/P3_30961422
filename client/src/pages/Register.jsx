import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'

export default function Register(){
  const { register } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    const res = await register({ email, password, username })
    if (res.success) nav('/catalog')
    else setError(res.error)
  }

  return (
    <div style={{maxWidth:480,margin:'24px auto'}}>
      <h2>Registro</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <form onSubmit={submit}>
        <div><label>Nombre</label><input value={username} onChange={e=>setUsername(e.target.value)} /></div>
        <div><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><label>Contraseña</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <div style={{marginTop:12}}><button type="submit">Crear cuenta</button></div>
      </form>
    </div>
  )
}
