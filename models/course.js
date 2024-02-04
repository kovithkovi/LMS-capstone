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

    static async getCompletionPercentage(
      userId,
      completionCount,
      totalPageCounts
    ) {
      try {
        const courses = await this.findAll();
        const completionPercentages = await Promise.all(
          courses.map(async (course) => {
            const totalPageCount = totalPageCounts.find(
              (tpc) => tpc.courseId === course.id
            ).totalPageCount;

            // Check if totalPageCount is greater than zero to avoid NaN
            const completionCountForCourse = completionCount.find(
              (cc) => cc.courseId === course.id
            ).completionCount;
            const completionPercentage =
              totalPageCount > 0
                ? completionCountForCourse / totalPageCount
                : 0;
            const formattedPercentage = completionPercentage.toLocaleString(
              undefined,
              { style: "percent", maximumFractionDigits: 0 }
            );
            return {
              courseId: course.id,
              completionPercentage: formattedPercentage,
            };
          })
        );
        return completionPercentages;
      } catch (error) {
        console.error("Error calculating completion percentage:", error);
        throw error;
      }
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

    static async getEnrollmentCount(courseId) {
      try {
        const course = await this.findByPk(courseId);
        if (!course) {
          throw new Error("Course not found");
        }
        return course.enroll.length;
      } catch (error) {
        console.error("Error getting enrollment count:", error);
        throw error;
      }
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
