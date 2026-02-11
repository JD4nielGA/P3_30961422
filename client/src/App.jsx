import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Catalog from './pages/Catalog'
import Orders from './pages/Orders'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'

const Protected = ({ children }) => {
  const { token } = React.useContext(AuthContext)
  if (!token) return <Navigate to="/login" />
  return children
}

export default function App(){
  return (
    <AuthProvider>
      <CartProvider>
      <div className="app">
        <header>
          <Link to="/">Inicio</Link>
          <Link to="/catalog">Catálogo</Link>
          <Link to="/orders">Mis Pedidos</Link>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/catalog" />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/catalog" element={<Catalog/>} />
            <Route path="/cart" element={<Cart/>} />
            <Route path="/checkout" element={<Checkout/>} />
            <Route path="/orders" element={<Protected><Orders/></Protected>} />
          </Routes>
        </main>
      </div>
      </CartProvider>
    </AuthProvider>
  )
}
