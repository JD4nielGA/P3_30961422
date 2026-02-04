import React, { useEffect, useState, useContext } from 'react'
import api from '../api'
import { CartContext } from '../contexts/CartContext'

export default function Catalog(){
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const cart = useContext(CartContext)

  const load = (p = 1) => {
    setLoading(true)
    const params = { page: p, limit: 12 }
    if (search) params.search = search
    if (priceMin) params.price_min = priceMin
    if (priceMax) params.price_max = priceMax
    api.products(params).then(r=>{
      if (r && r.success) { setProducts(r.data || []); setTotal(r.meta?.total||0) }
      setLoading(false)
    }).catch(()=>setLoading(false))
  }

  useEffect(()=>{ load(1) }, [])

  if (loading) return <div>Cargando productos...</div>

  const totalPages = Math.max(1, Math.ceil((total||products.length)/12))

  return (
    <div>
      <h2>Catálogo</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
        <input placeholder="Precio min" style={{width:100,marginLeft:8}} value={priceMin} onChange={e=>setPriceMin(e.target.value)} />
        <input placeholder="Precio max" style={{width:100,marginLeft:8}} value={priceMax} onChange={e=>setPriceMax(e.target.value)} />
        <button onClick={()=>{ setPage(1); load(1) }} style={{marginLeft:8}}>Filtrar</button>
      </div>

      <div className="grid">
        {products.map(p=> (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <div className="price">${(p.price||0).toFixed(2)}</div>
            <button onClick={()=>cart.add({ id: p.id, name: p.name, price: p.price })}>Agregar</button>
          </div>
        ))}
      </div>

      <div style={{marginTop:12}}>
        <button onClick={()=>{ if (page>1){ setPage(p=>p-1); load(page-1) } }}>Anterior</button>
        <span style={{margin:'0 8px'}}>Página {page} / {totalPages}</span>
        <button onClick={()=>{ if (page<totalPages){ setPage(p=>p+1); load(page+1) } }}>Siguiente</button>
      </div>
    </div>
  )
}
