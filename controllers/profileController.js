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

  // Membresías
  static async membership(req, res) {
    try {
      const membershipPlans = [
        {
          id: 'premium',
          name: 'Premium Mensual',
          price: 4.99,
          features: [
            'Acceso a contenido exclusivo',
            'Reseñas tempranas de películas',
            'Sin anuncios publicitarios',
            'Badge especial en tu perfil'
          ],
          duration: 30
        },
        {
          id: 'vip',
          name: 'VIP Mensual',
          price: 9.99,
          features: [
            'Todos los beneficios Premium',
            'Acceso a eventos exclusivos',
            'Descuentos en productos',
            'Soporte prioritario',
            'Podés influir en contenido futuro'
          ],
          duration: 30
        }
      ];
      
      res.render('user/membership', {
        title: 'Membresías - CineCríticas',
        user: req.session.user,
        plans: membershipPlans,
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

  // ✅ CORREGIDO: Procesar compra de membresía (API)
  static async purchaseMembership(req, res) {
    try {
      const { plan_id } = req.body;
      // ✅ CORRECCIÓN: Usar req.session.user.id
      const userId = req.session.user.id;
      
      console.log('🔍 Procesando compra de membresía:', { userId, plan_id });

      const paymentData = {
        payment_method: 'stripe',
        transaction_id: `MEM_${Date.now()}_${userId}`
      };

      const purchase = await DatabaseService.processMembershipPurchase(userId, plan_id, paymentData);

      res.json({
        success: true,
        message: `¡Felicidades! Ahora tienes membresía ${plan_id}`,
        data: {
          purchase_id: purchase.id,
          membership_type: plan_id,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
  // controllers/profileController.js - AÑADIR ESTE MÉTODO
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