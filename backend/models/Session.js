"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  /**
   * A server-side session for an account that signs in with a third party.
   * Its id is carried in the JWT (`sid`), so deleting the row signs the user
   * out, and the stored tokens let us end the third-party session too.
   */
  class Session extends Model {
    static associate({ User }) {
      this.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });
    }
  }
  Session.init(
    {
      id: {
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        type: DataTypes.UUID,
      },
      idToken: DataTypes.TEXT,
      accessToken: DataTypes.TEXT,
      // SHA-256 of the one-time code the browser trades for its JWT; null
      // once it has been used.
      handoffHash: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Session",
    },
  );
  return Session;
};
