"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Chapter.belongsTo(models.Course, {
        foreignKey: "courseId",
      });

      // A Chapter has many Pages with a foreign key named "chapterId"
      Chapter.hasMany(models.Page, {
        foreignKey: "chapterId",
      });
    }
    static getChapters() {
      return this.findAll({});
    }

    static getChapter(chapterId) {
      return this.findByPk(chapterId);
    }
    static getChaptersRespective(courseId) {
      return this.findAll({
        where: {
          courseId,
        },
      });
    }
    static addChapter(cname, description, courseId) {
      return this.create({
        Cname: cname,
        description,
        courseId,
      });
    }
  }
  Chapter.init(
    {
      Cname: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Chapter",
    }
  );
  return Chapter;
};
