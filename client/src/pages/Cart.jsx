import React, { useContext } from 'react'
import { CartContext } from '../contexts/CartContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Cart(){
  const { items, remove, clear, total } = useContext(CartContext)
  const nav = useNavigate()

  return (
    <div>
      <h2>Carrito</h2>
      {items.length===0 && <div>El carrito está vacío. <Link to="/catalog">Ir al catálogo</Link></div>}
      <ul>
        {items.map(i=> (
          <li key={i.id}>{i.name} x {i.qty} - ${(i.price||0).toFixed(2)} <button onClick={()=>remove(i.id)}>Quitar</button></li>
        ))}
      </ul>
      {items.length>0 && (
        <div>
          <div>Total: ${total().toFixed(2)}</div>
          <button onClick={()=>nav('/checkout')}>Ir a pagar</button>
          <button onClick={()=>clear()} style={{marginLeft:8}}>Vaciar</button>
        </div>
      )}
    </div>
  )
}
import React, { useContext } from 'react'
import { CartContext } from '../contexts/CartContext'
import { Link } from 'react-router-dom'

export default function Cart(){
  const { items, remove, total } = useContext(CartContext)

  if (!items.length) return <div><h2>Carrito vacío</h2><Link to="/catalog">Ir al catálogo</Link></div>

  return (
    <div>
      <h2>Carrito</h2>
      <ul>
        {items.map(i=> <li key={i.id}>{i.name} x {i.qty} - ${(i.price||0)*i.qty} <button onClick={()=>remove(i.id)}>Quitar</button></li>)}
      </ul>
      <div>Total: ${total().toFixed(2)}</div>
      <Link to="/checkout"><button>Ir a pagar</button></Link>
    </div>
  )
}
