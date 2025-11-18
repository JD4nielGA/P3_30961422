const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
let slugify;
try {
  slugify = require('slugify');
} catch (e) {
  // Fallback simple slug function
  slugify = (text, opts) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
}

// Línea de productos: Figuras de Colección

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
    defaultValue: 0.00
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  edition: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  release_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Tipo de producto: compra única (purchase) o membresía (membership)
  kind: {
    type: DataTypes.ENUM('purchase', 'membership'),
    allowNull: false,
    defaultValue: 'purchase'
  },
  // Polimórfico: referencia a Movie/Series cuando kind === 'purchase'
  productable_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  productable_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Campos para membresía cuando kind === 'membership'
  membership_billing_interval: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  membership_trial_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  membership_benefits: {
    type: DataTypes.JSON,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Generar slug único a partir del name y un sufijo si es necesario
Product.addHook('beforeValidate', async (product, options) => {
  if (product.name) {
    let base = slugify(product.name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;

    // Asegurar unicidad básica comprobando existencia en BD
    const Model = product.constructor;
    while (true) {
      const existing = await Model.findOne({ where: { slug } });
      if (!existing || existing.id === product.id) break;
      slug = `${base}-${counter}`;
      counter++;
    }
    product.slug = slug;
  }
});

module.exports = Product;
