/* eslint-disable no-undef */
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Course.hasMany(models.Chapter, {
        foreignKey: "courseId",
      });
    }

    static getCourse() {
      return this.findAll();
    }

    static addCourse(name) {
      return this.create({ name });
    }
    static getEnroll() {
      return this.findAll({
        where: {
          enroll: true,
        },
      });
    }

    static getAvailable() {
      return this.findAll({
        where: {
          enroll: false,
        },
      });
    }

    enrolled() {
      return this.update({ enroll: true });
    }
  }
  Course.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Course",
    }
  );
  return Course;
};
