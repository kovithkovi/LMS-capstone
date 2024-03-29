/* eslint-disable no-undef */
"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Page extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Page.belongsTo(models.Chapter, {
        foreignKey: "chapterId",
      });

      Page.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static getPages() {
      return this.findAll();
    }

    static getPagesRespective(chapterId) {
      return this.findAll({
        where: {
          chapterId,
        },
      });
    }

    static getPage(pageId) {
      return this.findByPk(pageId);
    }

    static addPages(title, content, chapterId) {
      return this.create({ title, content, chapterId });
    }

    markAsCompleted(userId) {
      return this.update({
        isCompleted: sequelize.fn(
          "array_append",
          sequelize.col("isCompleted"),
          userId
        ),
      });
    }

    // completeCheck(userId) {
    //   return this.findOne({
    //     where: {
    //       isCompleted: {
    //         [Op.contains]: [userId],
    //       },
    //     },
    //   });
    // }
    // static completeCheck(userId, id) {
    //   // Assuming YourModel is your Sequelize model
    //   const result = Page.findByPk(id,{
    //     where: {
    //       isCompleted: { [Op.contains]: [userId] },
    //     },
    //   });

    //   return result !== null; // If result is not null, userId is present in isCompleted array
    // }
    static async completeCheck(userId, id) {
      try {
        const page = await Page.findByPk(id);
        if (!page) {
          throw new Error("Page not found");
        }

        // Assuming isCompleted is an array field in your model
        const isCompletedArray = page.isCompleted || [];

        const isCompleted = isCompletedArray.includes(userId);
        return isCompleted;
      } catch (error) {
        console.error("Error checking completion:", error);
        throw error;
      }
    }
    static async getCompletionCount(courseId, userId) {
      try {
        const pages = await Page.findAll({
          where: {
            chapterId: {
              [Op.in]: sequelize.literal(
                `(SELECT "id" FROM "Chapters" WHERE "courseId" = ${courseId})`
              ),
            },
          },
        });
        const completionCount = await Promise.all(
          pages.map(async (page) => {
            const isCompleted = await Page.completeCheck(userId, page.id);
            return isCompleted ? 1 : 0;
          })
        );

        return completionCount.reduce((sum, count) => sum + count, 0);
      } catch (error) {
        console.error("Error calculating completion count:", error);
        throw error;
      }
    }

    static async getTotalPagesForCourse(courseId) {
      try {
        const totalPageCount = await Page.count({
          where: {
            chapterId: {
              [Op.in]: sequelize.literal(
                `(SELECT "id" FROM "Chapters" WHERE "courseId" = ${courseId})`
              ),
            },
          },
        });
        return totalPageCount;
      } catch (error) {
        console.error("Error counting total pages for course:", error);
        throw error;
      }
    }
  }
  Page.init(
    {
      title: DataTypes.STRING,
      content: DataTypes.TEXT,
      isCompleted: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "Page",
    }
  );
  return Page;
};
