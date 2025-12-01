const DatabaseService = require('../services/DatabaseService');

class HomeController {
  
  /**
   * Mostrar página de inicio
   */
  static async showHome(req, res) {
    try {
      console.log('🏠 Cargando página de inicio...');
      
      // Manejar sesión undefined de forma segura
      const user = req.session && req.session.user ? req.session.user : null;
      
      console.log('👤 Estado de sesión:', {
        hasSession: !!req.session,
        hasUser: !!user,
        userId: user ? user.id : 'No user'
      });

      // Verificar asociaciones primero
      await DatabaseService.checkReviewAssociations();

      // Obtener reseñas destacadas usando el método nuevo
      const featuredReviews = await DatabaseService.getFeaturedReviewsForHome();
      
      // Obtener reseñas recientes usando el método nuevo
      const allReviews = await DatabaseService.getRecentReviewsForHome();

      console.log('📊 Reseñas cargadas:', {
        destacadas: featuredReviews.length,
        total: allReviews.length
      });

      // DEBUG: Mostrar información de las primeras reseñas
      if (featuredReviews.length > 0) {
        console.log('🔍 DEBUG - Primera reseña destacada:', {
          id: featuredReviews[0].id,
          movie_title: featuredReviews[0].movie_title,
          user_id: featuredReviews[0].user_id,
          hasUserObject: !!featuredReviews[0].user,
          userData: featuredReviews[0].user ? {
            username: featuredReviews[0].user.username,
            role: featuredReviews[0].user.role
          } : 'No hay datos de usuario'
        });
      }

      // Procesar las reseñas para incluir la información del autor
      const processedFeaturedReviews = featuredReviews.map(review => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        
        console.log(`🔍 Procesando reseña ${reviewData.id}:`, {
          hasUser: !!reviewData.user,
          userData: reviewData.user
        });

        // Manejar diferentes estructuras de datos del usuario
        if (reviewData.user) {
          // Si viene con la asociación 'user'
          reviewData.username = reviewData.user.username || 'Usuario';
          reviewData.user_role = reviewData.user.role || 'user';
        } else if (reviewData.User) {
          // Si el alias es 'User' en lugar de 'user'
          reviewData.username = reviewData.User.username || 'Usuario';
          reviewData.user_role = reviewData.User.role || 'user';
        } else {
          // Si no viene con datos de usuario, intentar obtenerlos por separado
          console.log(`⚠️ Reseña ${reviewData.id} no tiene datos de usuario, buscando por separado...`);
          reviewData.username = 'Usuario';
          reviewData.user_role = 'user';
        }
        
        return reviewData;
      });

      const processedAllReviews = allReviews.map(review => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        
        if (reviewData.user) {
          reviewData.username = reviewData.user.username || 'Usuario';
          reviewData.user_role = reviewData.user.role || 'user';
        } else if (reviewData.User) {
          reviewData.username = reviewData.User.username || 'Usuario';
          reviewData.user_role = reviewData.User.role || 'user';
        } else {
          reviewData.username = 'Usuario';
          reviewData.user_role = 'user';
        }
        
        return reviewData;
      });

      res.render('home', {
        title: 'CineCríticas - Descubre y Comparte Reseñas',
        user: user, // Usar la variable segura
        featuredReviews: processedFeaturedReviews,
        allReviews: processedAllReviews,
        success: req.query.success,
        error: req.query.error
      });

    } catch (error) {
      console.error('❌ Error cargando página de inicio:', error);
      
      // También manejar sesión undefined en el catch
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('home', {
        title: 'CineCríticas - Descubre y Comparte Reseñas',
        user: user,
        featuredReviews: [],
        allReviews: [],
        error: 'Error al cargar las reseñas'
      });
    }
  }

  /**
   * Ruta de prueba para verificar asociaciones
   */
  static async testAssociations(req, res) {
    try {
      console.log('🔍 Probando asociaciones...');
      
      const result = await DatabaseService.checkReviewAssociations();
      
      // Obtener algunas reseñas con usuarios para debug
      const reviewsWithUsers = await DatabaseService.Review.findAll({
        include: [
          {
            model: DatabaseService.User,
            as: 'user',
            attributes: ['id', 'username', 'role']
          }
        ],
        limit: 3
      });
      
      const debugData = reviewsWithUsers.map(review => ({
        id: review.id,
        title: review.title,
        user_id: review.user_id,
        hasUser: !!review.user,
        username: review.user?.username,
        userRole: review.user?.role
      }));
      
      res.json({
        success: true,
        associationsWorking: result,
        sampleData: debugData,
        message: 'Asociaciones verificadas'
      });
    } catch (error) {
      console.error('❌ Error en testAssociations:', error);
      res.json({
        success: false,
        error: error.message,
        associationsWorking: false
      });
    }
  }

  /**
   * Mostrar página about
   */
  static async showAbout(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('about', {
        title: 'Acerca de - CineCríticas',
        user: user
      });
    } catch (error) {
      console.error('Error cargando página about:', error);
      res.redirect('/?error=Error al cargar la página');
    }
  }

  /**
   * Mostrar página de contacto
   */
  static async showContact(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('contact', {
        title: 'Contacto - CineCríticas',
        user: user
      });
    } catch (error) {
      console.error('Error cargando página de contacto:', error);
      res.redirect('/?error=Error al cargar la página');
    }
  }
}

module.exports = HomeController;