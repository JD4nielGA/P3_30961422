import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const auth = useContext(AuthContext)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    const res = await auth.login({ username, password })
    if (res && res.success) return nav('/catalog')
    setError(res && res.error ? res.error : 'Error al iniciar sesión')
  }

  return (
    <div className="auth">
      <h2>Iniciar Sesión</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <input placeholder="Usuario" value={username} onChange={e=>setUsername(e.target.value)} />
        <input placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button>Entrar</button>
      </form>
    </div>
  )
}
