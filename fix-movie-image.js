// fix-movie-image.js
const fs = require('fs');
const path = require('path');

console.log('=== REPARANDO IMAGEN DE PELÍCULA ===');

const sourceImage = 'movie-1764711534623-30651647.jpeg';
const targetDir = 'public/uploads/movies';

// Crear directorio si no existe
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`✅ Carpeta creada: ${targetDir}`);
}

// Ruta destino
const targetPath = path.join(targetDir, sourceImage);

// Verificar si ya existe
if (fs.existsSync(targetPath)) {
  console.log(`✅ La imagen ya existe en: ${targetPath}`);
  console.log(`   Tamaño: ${fs.statSync(targetPath).size} bytes`);
} else {
  console.log(`❌ La imagen NO existe en: ${targetPath}`);
  console.log('🛠️ Creando imagen de placeholder...');
  
  // Crear una imagen SVG simple como placeholder
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">
    <rect width="200" height="300" fill="#667eea"/>
    <text x="100" y="120" font-family="Arial" font-size="24" fill="white" text-anchor="middle" font-weight="bold">AVENGERS</text>
    <text x="100" y="150" font-family="Arial" font-size="16" fill="white" text-anchor="middle">2020</text>
    <text x="100" y="180" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Película de acción</text>
    <circle cx="100" cy="230" r="40" fill="white" opacity="0.2"/>
    <text x="100" y="235" font-family="Arial" font-size="32" fill="#667eea" text-anchor="middle">$20</text>
  </svg>`;
  
  fs.writeFileSync(targetPath, svgContent);
  console.log(`✅ Imagen placeholder creada en: ${targetPath}`);
}

// También crear imagen por defecto si no existe
const defaultImagePath = 'public/images/default-poster.jpg';
if (!fs.existsSync(path.dirname(defaultImagePath))) {
  fs.mkdirSync(path.dirname(defaultImagePath), { recursive: true });
}

if (!fs.existsSync(defaultImagePath)) {
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">
    <rect width="200" height="300" fill="#2d3748"/>
    <text x="100" y="150" font-family="Arial" font-size="18" fill="white" text-anchor="middle">IMAGEN NO</text>
    <text x="100" y="170" font-family="Arial" font-size="18" fill="white" text-anchor="middle">DISPONIBLE</text>
    <text x="100" y="250" font-family="Arial" font-size="12" fill="#a0aec0" text-anchor="middle">CineCríticas</text>
  </svg>`;
  
  fs.writeFileSync(defaultImagePath, defaultSvg);
  console.log(`✅ Imagen por defecto creada en: ${defaultImagePath}`);
}

console.log('=== REPARACIÓN COMPLETADA ===');