"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user', 'resetPasswordToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('user', 'resetPasswordExpires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user', 'resetPasswordToken');
    await queryInterface.removeColumn('user', 'resetPasswordExpires');
  },
};
