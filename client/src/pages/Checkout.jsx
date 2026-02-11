import React, { useContext, useState } from 'react'
import { CartContext } from '../contexts/CartContext'
import api from '../api'
import { useNavigate } from 'react-router-dom'

export default function Checkout(){
  const { items, clear } = useContext(CartContext)
  const [processing, setProcessing] = useState(false)
  const nav = useNavigate()
  const total = items.reduce((s,i)=> s + (i.price||0)*(i.qty||1), 0)

  const submit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const res = await api.createOrder({ items, amount: total })
      if (res && res.success) { clear(); nav('/orders') } else alert(res.error || 'Error procesando pago')
    } catch (err) { console.error(err); alert('Error de conexión') }
    setProcessing(false)
  }

  if (!items || items.length===0) return <div style={{maxWidth:900,margin:'12px auto'}}>No hay items en el carrito. <a href="/catalog">Volver</a></div>

  return (
    <div style={{maxWidth:900,margin:'12px auto'}}>
      <h2>Checkout</h2>
      <div style={{marginBottom:12}}>Total a pagar: €{total.toFixed(2)}</div>
      <form onSubmit={submit}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input name="card_number" placeholder="Número de tarjeta" required />
          <input name="expiry_date" placeholder="MM/YY" required />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
          <input name="cvv" placeholder="CVV" required />
          <input name="card_holder" placeholder="Titular" required />
        </div>
        <div style={{marginTop:12}}>
          <button type="submit" disabled={processing}>{processing? 'Procesando...':'Pagar €'+total.toFixed(2)}</button>
        </div>
      </form>
    </div>
  )
}

