import React, { createContext, useState, useEffect } from 'react'

export const CartContext = createContext(null)

export const CartProvider = ({ children }) => {
	const [items, setItems] = useState(() => {
		try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch(e){ return [] }
	})

	useEffect(() => {
		localStorage.setItem('cart', JSON.stringify(items));
	}, [items]);

	const add = (p) => setItems(prev => {
		const found = prev.find(i => i.id === p.id);
		if (found) return prev.map(i => i.id === p.id ? { ...i, qty: (i.qty||1)+1 } : i);
		return [...prev, { ...p, qty: 1 }];
	});

	const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));
	const clear = () => setItems([]);

	return (
		<CartContext.Provider value={{ items, add, remove, clear }}>
			{children}
		</CartContext.Provider>
	)
}
