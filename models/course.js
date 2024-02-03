/* eslint-disable no-undef */
"use strict";
const { Model, Op } = require("sequelize");

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

      Course.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static getCourse() {
      return this.findAll();
    }

    static addCourse(name, userId) {
      return this.create({ name, userId });
    }

    static getEnroll(userId) {
      return this.findAll({
        where: {
          enroll: {
            [Op.contains]: [userId],
          },
        },
      });
    }

    static getAvailable(userId) {
      return this.findAll({
        where: sequelize.literal(`NOT ${userId} = ANY("Course"."enroll")`),
      });
    }

    enrolled(userId) {
      return this.update({
        enroll: sequelize.fn("array_append", sequelize.col("enroll"), userId),
      });
    }
  }
  Course.init(
    {
      name: DataTypes.STRING,
      enroll: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "Course",
    }
  );
  return Course;
};
