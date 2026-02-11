module.exports = {
  requireAuth: (req, res, next) => {
    if (req.session && req.session.user) return next();
    req.session = req.session || {};
    req.session.returnTo = req.originalUrl || req.url;
    return res.redirect('/login');
  },
  requireAuthAPI: (req, res, next) => {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ error: 'Acceso denegado' });
  }
};
