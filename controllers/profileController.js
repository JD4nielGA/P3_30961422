// controllers/profileController.js
const DatabaseService = require('../services/DatabaseService');

class ProfileController {
  
  // Mostrar perfil de usuario
  static async showProfile(req, res) {
    try {
      const userId = req.session.user.id;
      
      // Obtener usuario con información básica
      const user = await DatabaseService.User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).render('error', {
          title: 'Usuario no encontrado',
          message: 'El usuario no existe.',
          user: req.session.user
        });
      }

      // Obtener reseñas del usuario para contar
      const userReviews = await DatabaseService.getReviewsByUserId(userId);
      
      // Obtener compras del usuario
      const userPurchases = await DatabaseService.getUserPurchases(userId);

      // Obtener estadísticas del perfil
      const stats = await DatabaseService.getUserProfileStats(userId);

      // Obtener reseñas recientes para mostrar (primeras 5)
      const recentReviews = userReviews.slice(0, 5);

      res.render('user/profile', {
        title: 'Mi Perfil - CineCríticas',
        user: user.toJSON ? user.toJSON() : user,
        reviews: recentReviews,
        reviewsCount: userReviews.length,
        totalPurchases: userPurchases.length,
        stats: stats || {
          reviewsCount: userReviews.length,
          totalPurchases: userPurchases.length,
          membershipType: user.membership_type || 'free',
          membershipExpires: user.membership_expires
        },
        currentPath: '/user/profile'
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar el perfil',
        user: req.session.user
      });
    }
  }

  // ✅ CORREGIDO: Actualizar información personal (API)
  static async updateProfile(req, res) {
    try {
      // ✅ CORRECCIÓN: Usar req.session.user.id en lugar de req.user.id
      const userId = req.session.user.id;
      const { full_name, email, current_password, new_password } = req.body;

      console.log('🔍 DEBUG - Actualizando perfil para usuario:', userId);
      console.log('🔍 DEBUG - Datos recibidos:', { full_name, email, hasCurrentPassword: !!current_password, hasNewPassword: !!new_password });

      const user = await DatabaseService.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'Usuario no encontrado' 
        });
      }

      // Preparar datos para actualizar
      const updateData = {};
      
      if (full_name !== undefined) updateData.full_name = full_name;
      if (email !== undefined) updateData.email = email;

      // Manejar cambio de contraseña
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ 
            success: false,
            error: 'La contraseña actual es requerida para cambiar la contraseña' 
          });
        }

        // Verificar contraseña actual
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
        if (!isValidPassword) {
          return res.status(400).json({ 
            success: false,
            error: 'Contraseña actual incorrecta' 
          });
        }

        // Hashear nueva contraseña
        updateData.password_hash = await bcrypt.hash(new_password, 10);
      }

      // Validar que hay datos para actualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No se proporcionaron datos para actualizar' 
        });
      }

      // Verificar si el email ya existe (excluyendo el usuario actual)
      if (email && email !== user.email) {
        const existingEmail = await DatabaseService.User.findOne({ 
          where: { email } 
        });
        if (existingEmail) {
          return res.status(400).json({ 
            success: false,
            error: 'El email ya está en uso' 
          });
        }
      }

      // Actualizar usuario
      const updatedUser = await user.update(updateData);

      // Preparar respuesta sin password
      const userResponse = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
      delete userResponse.password_hash;

      console.log('✅ Perfil actualizado exitosamente para usuario:', userId);
      
      res.json({ 
        success: true,
        message: 'Perfil actualizado correctamente',
        data: userResponse
      });
      
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Error al actualizar el perfil' 
      });
    }
  }

  // Historial de compras
  static async purchaseHistory(req, res) {
    try {
      const userId = req.session.user.id;
      
      const purchases = await DatabaseService.getUserPurchases(userId);

      res.render('user/purchase-history', {
        title: 'Historial de Compras - CineCríticas',
        purchases: purchases,
        user: req.session.user,
        currentPath: '/user/purchase-history'
      });
    } catch (error) {
      console.error('Error cargando historial de compras:', error);
      res.render('user/purchase-history', {
        title: 'Historial de Compras - CineCríticas',
        purchases: [],
        user: req.session.user,
        currentPath: '/user/purchase-history',
        error: 'Error al cargar el historial de compras'
      });
    }
  }

  // Mis reseñas
  static async myReviews(req, res) {
    try {
      const userId = req.session.user.id;
      
      const reviews = await DatabaseService.getReviewsByUserId(userId);

      res.render('user/my-reviews', {
        title: 'Mis Reseñas - CineCríticas',
        reviews: reviews,
        user: req.session.user,
        currentPath: '/user/my-reviews'
      });
    } catch (error) {
      console.error('Error cargando reseñas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar tus reseñas',
        user: req.session.user
      });
    }
  }

  // Membresías - ACTUALIZADO para solo Gratuito y VIP
  static async membership(req, res) {
    try {
      const userId = req.session.user.id;
      
      // Obtener información actual del usuario
      const user = await DatabaseService.User.findByPk(userId, {
        attributes: ['id', 'username', 'email', 'membership_type', 'membership_expires', 'membership_purchased']
      });

      if (!user) {
        return res.status(404).render('error', {
          title: 'Usuario no encontrado',
          message: 'El usuario no existe.',
          user: req.session.user
        });
      }

      const userData = user.toJSON ? user.toJSON() : user;
      
      res.render('user/membership', {
        title: 'Membresías - CineCríticas',
        user: {
          ...req.session.user,
          membership_type: userData.membership_type || 'free',
          membership_expires: userData.membership_expires,
          membership_purchased: userData.membership_purchased
        },
        currentPath: '/user/membership'
      });
    } catch (error) {
      console.error('Error cargando membresías:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar las membresías',
        user: req.session.user
      });
    }
  }

  // ✅ ACTUALIZADO: Procesar compra de membresía VIP (API)
  static async purchaseMembership(req, res) {
    try {
      const { plan_type, duration_days = 30 } = req.body;
      const userId = req.session.user.id;
      
      console.log('🔍 Procesando compra de membresía:', { userId, plan_type, duration_days });

      // Validar que el plan sea VIP (único plan de pago disponible)
      if (plan_type !== 'vip') {
        return res.status(400).json({ 
          success: false,
          error: 'Solo está disponible el plan VIP' 
        });
      }

      // Verificar si el usuario ya tiene una membresía activa
      const user = await DatabaseService.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'Usuario no encontrado' 
        });
      }

      // Si ya tiene membresía VIP activa, no permitir otra compra
      if (user.membership_type === 'vip' && user.membership_expires > new Date()) {
        return res.status(400).json({ 
          success: false,
          error: 'Ya tienes una membresía VIP activa. Podrás renovar cuando expire.' 
        });
      }

      const paymentData = {
        payment_method: 'stripe',
        transaction_id: `MEM_VIP_${Date.now()}_${userId}`,
        amount: 9.99, // Precio fijo para VIP
        currency: 'EUR'
      };

      // Procesar la compra de membresía
      const purchase = await DatabaseService.processMembershipPurchase(
        userId, 
        plan_type, 
        paymentData, 
        duration_days
      );

      // Actualizar la sesión del usuario con la nueva membresía
      req.session.user.membership_type = 'vip';
      req.session.user.membership_expires = purchase.membership_expires;

      res.json({
        success: true,
        message: `¡Felicidades! Ahora tienes membresía VIP por ${duration_days} días`,
        data: {
          purchase_id: purchase.id,
          membership_type: 'vip',
          expires: purchase.membership_expires,
          price: 9.99
        }
      });
      
    } catch (error) {
      console.error('Error procesando membresía:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Error al procesar la compra de membresía' 
      });
    }
  }

  // ✅ CORREGIDO: Obtener estadísticas del perfil (API)
  static async getProfileStats(req, res) {
    try {
      // ✅ CORRECCIÓN: Usar req.session.user.id
      const userId = req.session.user.id;
      
      const stats = await DatabaseService.getUserProfileStats(userId);

      res.json({ 
        success: true, 
        data: stats 
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener estadísticas del perfil' 
      });
    }
  }

  // ✅ NUEVO: Endpoint alternativo para estadísticas (sin JWT)
  static async getProfileStatsPublic(req, res) {
    try {
      // Este endpoint usa sesión en lugar de JWT
      const userId = req.session.user.id;
      
      const stats = await DatabaseService.getUserProfileStats(userId);

      res.json({ 
        success: true, 
        data: stats 
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas públicas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener estadísticas del perfil' 
      });
    }
  }

  // ✅ NUEVO: Método para verificar estado de membresía
  static async checkMembershipStatus(req, res) {
    try {
      const userId = req.session.user.id;
      
      const user = await DatabaseService.User.findByPk(userId, {
        attributes: ['membership_type', 'membership_expires', 'membership_purchased']
      });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'Usuario no encontrado' 
        });
      }

      const userData = user.toJSON ? user.toJSON() : user;
      const now = new Date();
      const isActive = userData.membership_type === 'vip' && 
                      userData.membership_expires && 
                      new Date(userData.membership_expires) > now;

      res.json({
        success: true,
        data: {
          membership_type: userData.membership_type || 'free',
          membership_expires: userData.membership_expires,
          membership_purchased: userData.membership_purchased,
          is_active: isActive,
          days_remaining: isActive ? 
            Math.ceil((new Date(userData.membership_expires) - now) / (1000 * 60 * 60 * 24)) : 0
        }
      });
    } catch (error) {
      console.error('Error verificando membresía:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al verificar el estado de la membresía' 
      });
    }
  }

  // ✅ ACTUALIZADO: Método temporal para testing
  static async updateProfileTemporary(req, res) {
    try {
        // ✅ TEMPORAL: Permitir actualización sin autenticación para testing
        const { full_name, email, current_password, new_password, user_id } = req.body;
        
        console.log('🔧 MODO TEMPORAL - Actualizando perfil sin autenticación');
        console.log('🔧 Datos recibidos:', { user_id, full_name, email, hasCurrentPassword: !!current_password, hasNewPassword: !!new_password });

        // Usar user_id del body o de la sesión si está disponible
        const userId = user_id || (req.session.user ? req.session.user.id : null);
        
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: 'ID de usuario requerido' 
            });
        }

        const user = await DatabaseService.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'Usuario no encontrado' 
            });
        }

        // Preparar datos para actualizar
        const updateData = {};
        
        if (full_name !== undefined) updateData.full_name = full_name;
        if (email !== undefined) updateData.email = email;

        // Manejar cambio de contraseña
        if (new_password) {
            if (!current_password) {
                return res.status(400).json({ 
                    success: false,
                    error: 'La contraseña actual es requerida para cambiar la contraseña' 
                });
            }

            // Verificar contraseña actual
            const bcrypt = require('bcryptjs');
            const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
            if (!isValidPassword) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Contraseña actual incorrecta' 
                });
            }

            // Hashear nueva contraseña
            updateData.password_hash = await bcrypt.hash(new_password, 10);
        }

        // Validar que hay datos para actualizar
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No se proporcionaron datos para actualizar' 
            });
        }

        // Verificar si el email ya existe (excluyendo el usuario actual)
        if (email && email !== user.email) {
            const existingEmail = await DatabaseService.User.findOne({ 
                where: { email } 
            });
            if (existingEmail) {
                return res.status(400).json({ 
                    success: false,
                    error: 'El email ya está en uso' 
                });
            }
        }

        // Actualizar usuario
        const updatedUser = await user.update(updateData);

        // Preparar respuesta sin password
        const userResponse = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
        delete userResponse.password_hash;

        console.log('✅ Perfil actualizado exitosamente (modo temporal) para usuario:', userId);
        
        res.json({ 
            success: true,
            message: 'Perfil actualizado correctamente (modo temporal)',
            data: userResponse
        });
        
    } catch (error) {
        console.error('Error actualizando perfil (temporal):', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Error al actualizar el perfil' 
        });
    }
  }
}

module.exports = ProfileController;