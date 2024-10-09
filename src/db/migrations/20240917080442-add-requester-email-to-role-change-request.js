// migrations/20240917120000-add-requester-email-to-role-change-request.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('RoleChangeRequest', 'requesterEmail', {
      type: Sequelize.STRING,
      allowNull: true, // Cho phép giá trị null nếu không có thông tin
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('RoleChangeRequest', 'requesterEmail');
  },
};
