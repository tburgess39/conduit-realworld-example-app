const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { isThirdParty } = require("../helper/account");
const { jwtVerify } = require("../helper/jwt");
const { Session, User } = require("../models");

const verifyToken = async (req, res, next) => {
  try {
    const { headers } = req;
    if (!headers.authorization) return next();

    const token = headers.authorization.split(" ")[1];
    if (!token) throw new SyntaxError("Token missing or malformed");

    const userVerified = await jwtVerify(token);
    if (!userVerified) throw new Error("Invalid Token");

    if (userVerified.sid) {
      // Third-party sign-in: the token is only as good as its session
      const session = await Session.findOne({
        where: { id: userVerified.sid, handoffHash: null },
      });
      if (!session) throw new UnauthorizedError();

      req.session = session;
      req.loggedUser = await User.findByPk(session.userId);
      if (!req.loggedUser) throw new NotFoundError("User");

      // Same shape as below: the email stays out of the user object
      headers.email = req.loggedUser.email;
      delete req.loggedUser.dataValues.email;
    } else {
      req.loggedUser = await User.findOne({
        attributes: { exclude: ["email"] },
        where: { email: userVerified.email },
      });
      if (!req.loggedUser) throw new NotFoundError("User");

      // Tokens from before an account was migrated no longer work
      if (isThirdParty(req.loggedUser)) throw new UnauthorizedError();

      headers.email = userVerified.email;
    }

    req.loggedUser.dataValues.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = verifyToken;
