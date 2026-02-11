import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../contexts/CartContext'

export default function Cart(){
  const { items, remove, clear } = useContext(CartContext)
  const total = items.reduce((s,i)=> s + (i.price||0)*(i.qty||1), 0)

  return (
    <div style={{maxWidth:900,margin:'12px auto'}}>
      <h2>Tu Carrito</h2>
      {items.length===0 && <div>Tu carrito está vacío. <Link to="/catalog">Volver al catálogo</Link></div>}
      {items.map(it=> (
        <div key={it.id} style={{display:'flex',justifyContent:'space-between',padding:8,borderBottom:'1px solid #eee'}}>
          <div>{it.name||it.title} <small>x{it.qty||1}</small></div>
          <div>€{((it.price||0)*(it.qty||1)).toFixed(2)} <button onClick={()=>remove(it.id)} style={{marginLeft:8}}>Eliminar</button></div>
        </div>
      ))}

      {items.length>0 && (
        <div style={{marginTop:16,textAlign:'right'}}>
          <div style={{fontWeight:700}}>Total: €{total.toFixed(2)}</div>
          <div style={{marginTop:8}}>
            <Link to="/checkout"><button>Proceder al pago</button></Link>
            <button onClick={clear} style={{marginLeft:8}}>Vaciar</button>
          </div>
        </div>
      )}
    </div>
  )
}
