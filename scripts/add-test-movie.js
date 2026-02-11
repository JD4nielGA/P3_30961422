// scripts/add-test-movie.js
const DatabaseService = require('../services/DatabaseService');

async function addTestMovie() {
  await DatabaseService.ensureDatabase();
  const Movie = DatabaseService.Movie;
  const testMovie = {
    title: 'CineCriticas Test Movie',
    description: 'Película de prueba para verificar búsqueda.',
    release_year: 2025,
    director: 'Test Director',
    duration: 120,
    poster_image: '/images/default-poster.jpg',
    trailer_url: '',
    price: 9.99,
    genre: 'Drama',
    type: 'movie',
    is_active: true
  };
  const movie = await Movie.create(testMovie);
  console.log('✅ Película de prueba agregada:', movie.title);
}

addTestMovie().catch(console.error);