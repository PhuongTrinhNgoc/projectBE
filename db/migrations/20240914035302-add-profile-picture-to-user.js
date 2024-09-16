// migrations/xxxxxx-add-profile-picture-to-user.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user', 'profilePicture', {
      type: Sequelize.STRING, // hoặc Sequelize.TEXT nếu bạn lưu trữ URL
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user', 'profilePicture');
  },
};
