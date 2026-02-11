import React, { useEffect, useState, useContext } from 'react'
import api from '../api'
import { AuthContext } from '../contexts/AuthContext'

export default function Orders(){
  const { token } = useContext(AuthContext)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if (!token) return
    api.orders().then(r=>{ if (r && r.success) setOrders(r.data||[]); setLoading(false) }).catch(()=>setLoading(false))
  },[token])

  if (!token) return <div>Debes iniciar sesión para ver tus pedidos.</div>
  if (loading) return <div>Cargando pedidos...</div>

  return (
    <div style={{maxWidth:900,margin:'16px auto'}}>
      <h2>Mis Pedidos</h2>
      {orders.length===0 && <div>No hay pedidos</div>}
      <ul>
        {orders.map(o=> (
          <li key={o.id}>#{o.id} - {o.movie_title||o.description||o.type} - €{(o.amount||0).toFixed(2)} - {o.status}</li>
        ))}
      </ul>
    </div>
  )
}
