"use strict";
const { Model } = require("sequelize");
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

    markAsCompleted() {
      return this.update({ isCompleted: true });
    }
  }
  Page.init(
    {
      title: DataTypes.STRING,
      content: DataTypes.TEXT,
      isCompleted: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Page",
    }
  );
  return Page;
};
