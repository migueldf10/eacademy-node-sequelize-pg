'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      transaction.belongsTo(models.user)
      transaction.hasMany(models.lineItem)
    }
  };
  transaction.init({
    userId: DataTypes.INTEGER,
    price: DataTypes.FLOAT,
    notes: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'transaction',
  });
  return transaction;
};