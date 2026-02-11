// routes/user.js - VERIFICAR QUE SOLO EXISTA UNA RUTA /profile
const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// Rutas de vistas
router.get('/profile', requireAuth, ProfileController.showProfile);
router.get('/my-reviews', requireAuth, ProfileController.myReviews);
router.get('/purchase-history', requireAuth, ProfileController.purchaseHistory);
router.get('/membership', requireAuth, ProfileController.membership);

// ✅ SOLO UNA RUTA PUT /profile - VERIFICAR QUE NO HAY DUPLICADAS
router.put('/profile', requireAuth, ProfileController.updateProfile);
router.get('/profile/stats', requireAuth, ProfileController.getProfileStats);
router.post('/membership/purchase', requireAuth, ProfileController.purchaseMembership);
// routes/user.js - AÑADIR ESTA RUTA TEMPORAL
router.put('/profile/session', requireAuth, ProfileController.updateProfile);

// Rutas para carrito del usuario (se guardan en sesión)
router.get('/cart', requireAuth, (req, res) => {
	try {
		const sessionCart = req.session.cart || [];
		const user = Object.assign({}, req.session.user || {});
		// Asegurar que la propiedad cart esté presente para la vista
		user.cart = sessionCart;
		res.render('user/cart', {
			title: 'Mi Carrito',
			user: user,
			currentPath: req.originalUrl
		});
	} catch (err) {
		console.error('Error mostrando carrito:', err);
		res.status(500).render('error', { title: 'Error', message: 'No se pudo mostrar el carrito.' });
	}
});

// Guardar carrito (POST) — guarda en sesión y responde JSON
router.post('/cart', requireAuth, express.json(), (req, res) => {
	try {
		const cart = Array.isArray(req.body && req.body.cart) ? req.body.cart : [];
		req.session.cart = cart;
		// No intentamos escribir en el modelo User (campo `cart` eliminado)
		return res.json({ success: true });
	} catch (err) {
		console.error('Error guardando carrito:', err);
		return res.status(500).json({ success: false, error: err.message });
	}
});

// Añadir un ítem al carrito (POST) — guarda en sesión y responde JSON
router.post('/cart/add', requireAuth, express.json(), (req, res) => {
	try {
		const { movieId, title, price, qty } = req.body || {};
		if (!movieId) {
			return res.status(400).json({ success: false, error: 'movieId es requerido' });
		}

		// Forzar que sólo se pueda comprar 1 unidad por película
		const item = {
			movieId: String(movieId),
			title: title || 'Película',
			price: parseFloat(price) || 0,
			qty: 1
		};

		req.session.cart = req.session.cart || [];

		// Si ya existe el item, aumentar cantidad
		const existing = req.session.cart.find(i => String(i.movieId) === String(item.movieId));
		if (existing) {
			// No permitir cantidades mayores a 1: ya está en el carrito
			existing.qty = 1;
		} else {
			req.session.cart.push(item);
		}

		return res.json({ success: true, cartCount: req.session.cart.reduce((s, it) => s + (it.qty || 0), 0) });
	} catch (err) {
		console.error('Error añadiendo al carrito:', err);
		return res.status(500).json({ success: false, error: err.message });
	}
});
module.exports = router;