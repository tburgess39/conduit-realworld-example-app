"use strict";

const userColumns = (Sequelize) => ({
  authIssuer: Sequelize.STRING,
  authSubject: Sequelize.STRING,
  currentLoginAt: Sequelize.DATE,
  currentLoginMethod: Sequelize.STRING,
  lastLoginAt: Sequelize.DATE,
  lastLoginMethod: Sequelize.STRING,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [name, type] of Object.entries(userColumns(Sequelize))) {
      await queryInterface.addColumn("Users", name, { type });
    }

    await queryInterface.createTable("Sessions", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      idToken: {
        type: Sequelize.TEXT,
      },
      accessToken: {
        type: Sequelize.TEXT,
      },
      handoffHash: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Sessions");

    for (const name of Object.keys(userColumns(Sequelize))) {
      await queryInterface.removeColumn("Users", name);
    }
  },
};
