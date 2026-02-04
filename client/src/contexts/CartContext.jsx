import React, { createContext, useState, useEffect } from 'react'

export const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')||'[]') } catch(e){return []}
  })

  useEffect(()=>{
    localStorage.setItem('cart', JSON.stringify(items))
  },[items])

  const add = (product, qty=1) => {
    setItems(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(i=>i.id===product.id)
      if (idx>=0) { copy[idx].qty += qty } else { copy.push({ ...product, qty }) }
      return copy
    })
  }
  const remove = (id) => setItems(prev => prev.filter(i=>i.id!==id))
  const clear = () => setItems([])
  const total = () => items.reduce((s,i)=>s + (i.price||0)*i.qty,0)

  return (
    <CartContext.Provider value={{ items, add, remove, clear, total }}>
      {children}
    </CartContext.Provider>
  )
}
