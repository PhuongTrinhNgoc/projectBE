'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user', 'changeRoleToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('user', 'changeRoleTokenExpires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user', 'changeRoleToken');
    await queryInterface.removeColumn('user', 'changeRoleTokenExpires');
  }
};
