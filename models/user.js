/* eslint-disable no-undef */
"use strict";
const { Model } = require("sequelize");
// Import necessary models

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.Page, {
        foreignKey: "userId",
      });

      User.hasMany(models.Course, {
        foreignKey: "userId",
      });
    }

    static userdata() {
      return this.findAll();
    }

    makeadmin() {
      return this.update({ admin: true });
    }

    updatePassword(password) {
      return this.update({ password: password });
    }
    static getByEmail(email) {
      return this.findOne({
        where: { email },
      });
    }
  }
  User.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      admin: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
