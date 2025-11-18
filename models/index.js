// models/index.js - VERSIÓN ACTUALIZADA
const { sequelize } = require('../config/database');
const User = require('./User');
const Review = require('./Review');
const Movie = require('./Movie');
const Category = require('./Category');
const Tag = require('./Tag');
const Product = require('./Product');
const Series = require('./Series'); // Asegúrate de tener este archivo

// Relaciones básicas
User.hasMany(Review, { foreignKey: 'user_id' });
Review.belongsTo(User, { foreignKey: 'user_id' });

// Relaciones para productos
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

// Relación muchos a muchos Product <-> Tag
Product.belongsToMany(Tag, { through: 'ProductTags', foreignKey: 'product_id' });
Tag.belongsToMany(Product, { through: 'ProductTags', foreignKey: 'tag_id' });

// Sincronización
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('\u2705 Conexión a SQLite establecida.');

    await sequelize.sync({ force: false });
    console.log('\u2705 Modelos sincronizados.');

    return true;
  } catch (error) {
    console.error('\u274c Error de base de datos:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  User,
  Review,
  Movie,
  Category,
  Tag,
  Product,
  Series,
  initializeDatabase
};