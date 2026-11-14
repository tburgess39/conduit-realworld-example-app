const { providerName } = require("./oidc");

const PASSWORD_LOGIN = "password";

/** Whether the account signs in with a third party instead of a password. */
const isThirdParty = (user) => Boolean(user.authSubject);

/** Records a new login, keeping the one it replaces as the "last login". */
const recordLogin = async (user, method) => {
  user.lastLoginAt = user.currentLoginAt;
  user.lastLoginMethod = user.currentLoginMethod;
  user.currentLoginAt = new Date();
  user.currentLoginMethod = method;

  await user.save();
};

const loginInfo = (at, method) => (at ? { at, method } : null);

/**
 * Adds what only the account owner may see to the serialized user:
 * how they sign in, and their current and previous logins.
 */
const appendAccountInfo = (user) => {
  user.dataValues.authProvider = isThirdParty(user) ? providerName : null;
  user.dataValues.currentLogin = loginInfo(
    user.currentLoginAt,
    user.currentLoginMethod,
  );
  user.dataValues.lastLogin = loginInfo(user.lastLoginAt, user.lastLoginMethod);
};

module.exports = {
  PASSWORD_LOGIN,
  appendAccountInfo,
  isThirdParty,
  recordLogin,
};
