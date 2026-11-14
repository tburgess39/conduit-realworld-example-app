"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Article, Comment, Session, User }) {
      // define association here

      // Articles
      this.hasMany(Article, { foreignKey: "userId", onDelete: "CASCADE" });

      // Comments
      this.hasMany(Comment, { foreignKey: "articleId" });

      // Third-party sign-in sessions
      this.hasMany(Session, { foreignKey: "userId", onDelete: "CASCADE" });

      // Favorites
      this.belongsToMany(Article, {
        through: "Favorites",
        as: "favorites",
        foreignKey: "userId",
        timestamps: false,
      });

      // Followers
      this.belongsToMany(User, {
        through: "Followers",
        as: "followers",
        foreignKey: "userId",
        timestamps: false,
      });
      this.belongsToMany(User, {
        through: "Followers",
        as: "following",
        foreignKey: "followerId",
        timestamps: false,
      });
    }

    toJSON() {
      return {
        ...this.get(),
        id: undefined,
        password: undefined,
        updatedAt: undefined,
        createdAt: undefined,
        // Account-private: only exposed to the owner, see helper/account.js
        authIssuer: undefined,
        authSubject: undefined,
        currentLoginAt: undefined,
        currentLoginMethod: undefined,
        lastLoginAt: undefined,
        lastLoginMethod: undefined,
      };
    }
  }
  User.init(
    {
      email: DataTypes.STRING,
      username: DataTypes.STRING,
      bio: DataTypes.TEXT,
      image: DataTypes.TEXT,
      password: DataTypes.STRING,
      // Third-party (OpenID Connect) identity. Set once, on sign up or on
      // migration, and never cleared: such accounts have no password.
      authIssuer: DataTypes.STRING,
      authSubject: DataTypes.STRING,
      // The login that started the current session, and the one before it
      currentLoginAt: DataTypes.DATE,
      currentLoginMethod: DataTypes.STRING,
      lastLoginAt: DataTypes.DATE,
      lastLoginMethod: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    },
  );
  return User;
};
