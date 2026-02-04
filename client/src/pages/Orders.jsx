import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Orders(){
  const [orders, setOrders] = useState([])

  useEffect(()=>{
    api.orders().then(r=>{ if (r && r.success) setOrders(r.data || []) }).catch(()=>{})
  },[])

  return (
    <div>
      <h2>Mis Pedidos</h2>
      {orders.length===0 && <div>No hay pedidos</div>}
      <ul>
        {orders.map(o=> (
          <li key={o.id}>#{o.id} - ${o.total_amount || o.amount || 0} - {o.status}</li>
        ))}
      </ul>
    </div>
  )
}
