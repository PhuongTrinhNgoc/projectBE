// models/RoleChangeRequest.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const RoleChangeRequest = sequelize.define(
  "RoleChangeRequest",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user",
        key: "id",
      },
    },

    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
      allowNull: false,
    },
    requesterEmail: {
      // Trường mới
      type: DataTypes.STRING,
      allowNull: true,
    },
    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "user",
        key: "id",
      },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    freezeTableName: true,
    modelName: "RoleChangeRequest",
  }
);

RoleChangeRequest.associate = function (models) {
  RoleChangeRequest.belongsTo(models.user, {
    foreignKey: "userId",
    as: "requester",
  });
  RoleChangeRequest.belongsTo(models.user, {
    foreignKey: "reviewedBy",
    as: "reviewer",
  });
};

module.exports = RoleChangeRequest;
