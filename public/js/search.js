// search.js - Búsqueda en vivo para la página de búsqueda

document.addEventListener('DOMContentLoaded', function() {
  const searchForm = document.querySelector('.search-form');
  const searchInput = document.querySelector('.search-form input[name="q"]');
  const resultsSection = document.querySelector('.search-results');
  const resultsList = document.querySelector('.search-results ul');
  const resultsTitle = document.querySelector('.search-results h2');
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = 'Buscando...';

  if (!searchForm || !searchInput) return;

  // Búsqueda en vivo al escribir
  searchInput.addEventListener('input', function(e) {
    const q = searchInput.value.trim();
    if (q.length < 2) {
      if (resultsList) resultsList.innerHTML = '';
      if (resultsTitle) resultsTitle.textContent = 'Resultados';
      return;
    }
    if (resultsSection && !resultsSection.contains(loader)) {
      resultsSection.appendChild(loader);
    }
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(res => res.json())
      .then(data => {
        if (resultsSection && resultsSection.contains(loader)) {
          resultsSection.removeChild(loader);
        }
        if (data.success && Array.isArray(data.movies)) {
          if (resultsList) {
            resultsList.innerHTML = '';
            if (data.movies.length === 0) {
              resultsList.innerHTML = '<li>No se encontraron resultados.</li>';
            } else {
              data.movies.forEach(movie => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="/movie/${movie.id}">${movie.title}</a> ${movie.release_year ? '(' + movie.release_year + ')' : ''}`;
                resultsList.appendChild(li);
              });
            }
          }
        }
      });
  });
});
