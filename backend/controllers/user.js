const {
  UnauthorizedError,
  ValidationError,
} = require("../helper/customErrors");
const { bcryptHash } = require("../helper/bcrypt");
const { providerName } = require("../helper/oidc");
const { appendAccountInfo, isThirdParty } = require("../helper/account");

// Everything else on the account (how it signs in, its login history...) is
// not the user's to edit.
const EDITABLE_FIELDS = ["bio", "email", "image", "username"];

//* Current User
const currentUser = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    loggedUser.dataValues.email = req.headers.email;
    delete req.headers.email;
    appendAccountInfo(loggedUser);

    res.json({ user: loggedUser });
  } catch (error) {
    next(error);
  }
};

//* Update User
const updateUser = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const {
      user: { password },
      user,
    } = req.body;

    EDITABLE_FIELDS.forEach((key) => {
      if (user[key] !== undefined) loggedUser[key] = user[key];
    });

    if (password) {
      if (isThirdParty(loggedUser)) {
        throw new ValidationError(
          `This account signs in with ${providerName}, it cannot have a password`,
        );
      }

      loggedUser.password = await bcryptHash(password);
    }

    await loggedUser.save();
    appendAccountInfo(loggedUser);

    res.json({ user: loggedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { currentUser, updateUser };
