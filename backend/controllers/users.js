const { User } = require("../models");
const { jwtSign } = require("../helper/jwt");
const { bcryptHash, bcryptCompare } = require("../helper/bcrypt");
const { providerName } = require("../helper/oidc");
const {
  PASSWORD_LOGIN,
  appendAccountInfo,
  isThirdParty,
  recordLogin,
} = require("../helper/account");
const {
  ValidationError,
  FieldRequiredError,
  AlreadyTakenError,
  NotFoundError,
} = require("../helper/customErrors");

// Register
const signUp = async (req, res, next) => {
  try {
    const { username, email, bio, image, password } = req.body.user;
    if (!username) throw new FieldRequiredError(`A username`);
    if (!email) throw new FieldRequiredError(`An email`);
    if (!password) throw new FieldRequiredError(`A password`);

    const userExists = await User.findOne({
      where: { email: req.body.user.email },
    });
    if (userExists) throw new AlreadyTakenError("Email", "try logging in");

    const newUser = await User.create({
      email: email,
      username: username,
      bio: bio,
      image: image,
      password: await bcryptHash(password),
    });
    await recordLogin(newUser, PASSWORD_LOGIN);

    newUser.dataValues.token = await jwtSign(newUser);
    appendAccountInfo(newUser);

    res.status(201).json({ user: newUser });
  } catch (error) {
    next(error);
  }
};

// Login
const signIn = async (req, res, next) => {
  try {
    const { user } = req.body;

    const existentUser = await User.findOne({ where: { email: user.email } });
    if (!existentUser) throw new NotFoundError("Email", "sign in first");

    // These accounts have no password, for good
    if (isThirdParty(existentUser)) {
      throw new ValidationError(
        `This account signs in with ${providerName}, not with a password`,
      );
    }

    const pwd = await bcryptCompare(user.password, existentUser.password);
    if (!pwd) throw new ValidationError("Wrong email/password combination");
    await recordLogin(existentUser, PASSWORD_LOGIN);

    existentUser.dataValues.token = await jwtSign(user);
    appendAccountInfo(existentUser);

    res.json({ user: existentUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { signUp, signIn };
