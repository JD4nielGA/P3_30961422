import React, { useContext, useState } from 'react'
import { CartContext } from '../contexts/CartContext'
import api from '../api'
import { useNavigate } from 'react-router-dom'

export default function Checkout(){
  const { items, total, clear } = useContext(CartContext)
  const [processing, setProcessing] = useState(false)
  const nav = useNavigate()

  const [cardNumber, setCardNumber] = useState('4242424242424242')
  const [expiry, setExpiry] = useState('12/26')
  const [cvv, setCvv] = useState('123')
  const [holder, setHolder] = useState('Cliente Test')

  const doPurchase = async () => {
    setProcessing(true)
    try {
      const payload = {
        items: items.map(i=>({ productId: i.id, quantity: i.qty })),
        paymentMethod: 'card',
        paymentDetails: { card_number: cardNumber, expiry_date: expiry, cvv, card_holder: holder }
      }
      const res = await api.createOrder(payload)
      if (res && res.success) {
        clear();
        nav('/orders')
      } else if (res && !res.success) {
        alert('Error procesando la orden: ' + (res.error || JSON.stringify(res)))
      } else {
        alert('Error en la orden: ' + JSON.stringify(res))
      }
    } catch (err) {
      alert('Error procesando pago')
    }
    setProcessing(false)
  }

  return (
    <div>
      <h2>Checkout</h2>
      <div>Total: ${total().toFixed(2)}</div>

      <div style={{marginTop:12}}>
        <h4>Datos de pago (simulados)</h4>
        <input placeholder="Titular" value={holder} onChange={e=>setHolder(e.target.value)} />
        <input placeholder="Número de tarjeta" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} />
        <input placeholder="Expiración MM/AA" value={expiry} onChange={e=>setExpiry(e.target.value)} />
        <input placeholder="CVV" value={cvv} onChange={e=>setCvv(e.target.value)} />
      </div>

      <div style={{marginTop:12}}>
        <button onClick={doPurchase} disabled={processing}>{processing? 'Procesando...':'Pagar ahora'}</button>
      </div>
    </div>
  )
}
