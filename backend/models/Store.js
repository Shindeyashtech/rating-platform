module.exports = (sequelize, DataTypes) => {
  const Store = sequelize.define('Store', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
      validate: {
        len: [1, 60]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    address: { type: DataTypes.STRING(400), allowNull: true },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {});
  return Store;
};
