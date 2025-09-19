const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require('./user')(sequelize, Sequelize);
db.Store = require('./Store')(sequelize, Sequelize);
db.Rating = require('./Rating')(sequelize, Sequelize);

// Associations
db.User.hasMany(db.Rating, { foreignKey: 'userId' });
db.Rating.belongsTo(db.User, { foreignKey: 'userId' });

db.Store.hasMany(db.Rating, { foreignKey: 'storeId' });
db.Rating.belongsTo(db.Store, { foreignKey: 'storeId' });

// New association: Store belongs to User (owner)
db.User.hasMany(db.Store, { foreignKey: 'ownerId' });
db.Store.belongsTo(db.User, { foreignKey: 'ownerId' });

module.exports = db;
