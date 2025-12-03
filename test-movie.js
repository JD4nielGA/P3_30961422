// test-movie.js
const { Movie, Product, sequelize } = require('./models');

async function testMovie(id) {
  console.log('=== TEST DE PELÍCULA ===');
  console.log(`Buscando película ID: ${id}`);
  
  try {
    // 1. Buscar con Sequelize
    console.log('\n1. Buscando con Sequelize...');
    const movie = await Movie.findByPk(id);
    
    if (!movie) {
      console.log('❌ Película no encontrada con findByPk');
    } else {
      console.log('✅ Película encontrada con findByPk');
      console.log('Datos:', JSON.stringify(movie.dataValues, null, 2));
    }
    
    // 2. Buscar con raw SQL
    console.log('\n2. Buscando con SQL directo...');
    const [results] = await sequelize.query(
      'SELECT * FROM movies WHERE id = ?',
      { replacements: [id], type: sequelize.QueryTypes.SELECT }
    );
    
    if (!results) {
      console.log('❌ Película no encontrada con SQL');
    } else {
      console.log('✅ Película encontrada con SQL');
      console.log('Datos:', JSON.stringify(results, null, 2));
    }
    
    // 3. Listar todas las películas
    console.log('\n3. Listando todas las películas...');
    const allMovies = await Movie.findAll({ limit: 5 });
    console.log('Primeras 5 películas:');
    allMovies.forEach((m, i) => {
      console.log(`${i+1}. ID: ${m.id}, Título: ${m.title}`);
    });
    
    // 4. Ver estructura de la tabla
    console.log('\n4. Estructura de tabla movies:');
    const [columns] = await sequelize.query(
      "PRAGMA table_info(movies)",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('Columnas:', columns.map(c => c.name).join(', '));
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar test
const movieId = process.argv[2] || 1; // Usar ID de parámetro o 1 por defecto
testMovie(movieId).then(() => {
  console.log('\n=== TEST COMPLETADO ===');
  process.exit(0);
});