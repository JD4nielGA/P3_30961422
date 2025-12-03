const fs = require('fs');
const path = require('path');

console.log('=== VERIFICACIÓN Y REPARACIÓN DE IMÁGENES ===\n');

// 1. Verificar estructura de carpetas
const requiredDirs = [
    'public',
    'public/images',
    'public/uploads',
    'public/uploads/movies'
];

console.log('📁 Verificando estructura de carpetas:');
requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`❌ ${dir} - NO EXISTE, creando...`);
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ ${dir} - CREADA`);
    } else {
        console.log(`✅ ${dir} - OK`);
    }
});

// 2. Buscar la imagen específica
const targetImage = 'movie-1764711534623-30651647.jpeg';
const imagePaths = [
    'public/uploads/movies/' + targetImage,
    'public/uploads/' + targetImage,
    'uploads/movies/' + targetImage,
    targetImage
];

console.log(`\n🔍 Buscando imagen: ${targetImage}`);
let imageFound = false;

imagePaths.forEach(imgPath => {
    if (fs.existsSync(imgPath)) {
        console.log(`✅ ENCONTRADA en: ${imgPath}`);
        console.log(`   Tamaño: ${fs.statSync(imgPath).size} bytes`);
        imageFound = true;
        
        // Copiar a la ubicación correcta si no está en public/uploads/movies/
        const correctPath = 'public/uploads/movies/' + targetImage;
        if (imgPath !== correctPath) {
            console.log(`📋 Copiando a ubicación correcta: ${correctPath}`);
            fs.copyFileSync(imgPath, correctPath);
        }
    }
});

// 3. Si no se encuentra, crear imagen de prueba
if (!imageFound) {
    console.log('❌ Imagen NO encontrada en ninguna ubicación');
    console.log('🛠️ Creando imagen de prueba...');
    
    const testImagePath = 'public/uploads/movies/' + targetImage;
    
    // Crear una imagen SVG simple (convertida a JPEG con un script simple)
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
        <rect width="800" height="1200" fill="#1a365d"/>
        <text x="400" y="300" font-family="Arial" font-size="60" fill="white" text-anchor="middle" font-weight="bold">AVENGERS</text>
        <text x="400" y="400" font-family="Arial" font-size="40" fill="#48bb78" text-anchor="middle">2020</text>
        <circle cx="400" cy="700" r="150" fill="#4299e1" opacity="0.8"/>
        <text x="400" y="710" font-family="Arial" font-size="80" fill="white" text-anchor="middle">$20</text>
        <text x="400" y="1000" font-family="Arial" font-size="30" fill="#a0aec0" text-anchor="middle">CineCríticas</text>
    </svg>`;
    
    fs.writeFileSync(testImagePath, svgContent);
    console.log(`✅ Imagen de prueba creada en: ${testImagePath}`);
}

// 4. Crear imagen por defecto si no existe
const defaultImagePath = 'public/images/default-poster.jpg';
if (!fs.existsSync(defaultImagePath)) {
    console.log('\n🖼️ Creando imagen por defecto...');
    
    const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
        <rect width="800" height="1200" fill="#2d3748"/>
        <rect x="200" y="300" width="400" height="400" fill="#4a5568" rx="20"/>
        <text x="400" y="450" font-family="Arial" font-size="50" fill="white" text-anchor="middle">🎬</text>
        <text x="400" y="550" font-family="Arial" font-size="40" fill="white" text-anchor="middle" font-weight="bold">PELÍCULA</text>
        <text x="400" y="620" font-family="Arial" font-size="30" fill="#a0aec0" text-anchor="middle">Imagen no disponible</text>
        <text x="400" y="1000" font-family="Arial" font-size="25" fill="#718096" text-anchor="middle">CineCríticas</text>
    </svg>`;
    
    fs.writeFileSync(defaultImagePath, defaultSvg);
    console.log(`✅ Imagen por defecto creada en: ${defaultImagePath}`);
}

// 5. Listar todas las imágenes en uploads
console.log('\n📂 Contenido de public/uploads/movies/:');
if (fs.existsSync('public/uploads/movies')) {
    const files = fs.readdirSync('public/uploads/movies');
    if (files.length === 0) {
        console.log('   (vacío)');
    } else {
        files.forEach(file => {
            const filePath = path.join('public/uploads/movies', file);
            const stats = fs.statSync(filePath);
            console.log(`   📄 ${file} - ${stats.size} bytes`);
        });
    }
}

console.log('\n=== VERIFICACIÓN COMPLETADA ===');