const crypto = require("crypto");
const { Op } = require("sequelize");
const { Session, User } = require("../models");
const { jwtSign } = require("../helper/jwt");
const { bcryptCompare } = require("../helper/bcrypt");
const oidc = require("../helper/oidc");
const { SignInError } = oidc;
const {
  appendAccountInfo,
  isThirdParty,
  recordLogin,
} = require("../helper/account");
const {
  FieldRequiredError,
  UnauthorizedError,
  ValidationError,
} = require("../helper/customErrors");

// The callback leaves the browser a one-time code, which the app then trades
// for its token: the token itself never travels through a URL.
const HANDOFF_COOKIE = "oidc_handoff";
const HANDOFF_TTL_SECONDS = 2 * 60;

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const handoffCutoff = () => new Date(Date.now() - HANDOFF_TTL_SECONDS * 1000);

/** A username nobody has yet, as close to the provider's as possible. */
const availableUsername = async ({
  preferred_username,
  nickname,
  name,
  email,
}) => {
  const wanted = preferred_username || nickname || name || email;
  const base = wanted.split("@")[0].trim() || "user";

  for (let suffix = 1; ; suffix++) {
    const username = suffix === 1 ? base : `${base}${suffix}`;
    if (!(await User.findOne({ where: { username } }))) return username;
  }
};

const findIdentity = ({ iss, sub }) =>
  User.findOne({ where: { authIssuer: iss, authSubject: sub } });

/** Sign in with a third party, signing up on the first visit. */
const signInOrSignUp = async (claims) => {
  const user = await findIdentity(claims);
  if (user) return user;

  const { email, email_verified, picture } = claims;
  if (!email || email_verified === false) {
    throw new SignInError("email_missing");
  }
  // Never linked implicitly: the owner has to opt in from their settings
  if (await User.findOne({ where: { email } })) {
    throw new SignInError("email_exists");
  }

  return User.create({
    email,
    username: await availableUsername(claims),
    image: picture,
    authIssuer: claims.iss,
    authSubject: claims.sub,
  });
};

/** Permanently switches a password account over to the third party. */
const migrate = async (userId, claims) => {
  const user = await User.findByPk(userId);
  if (!user) throw new SignInError("failed");
  if (isThirdParty(user)) throw new SignInError("already_migrated");
  if (await findIdentity(claims)) throw new SignInError("identity_taken");

  user.authIssuer = claims.iss;
  user.authSubject = claims.sub;
  user.password = null;

  return user.save();
};

//? Which third party, if any, can be used to sign in
const provider = (req, res) => {
  res.json({ provider: oidc.enabled ? { name: oidc.providerName } : null });
};

//? Send the browser to the third party to sign in or sign up
const startLogin = async (req, res, next) => {
  try {
    res.redirect(await oidc.startAuthorization(res, { intent: "login" }));
  } catch (error) {
    next(error);
  }
};

//* Start migrating the logged-in password account to the third party
const startMigration = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();
    if (isThirdParty(loggedUser)) {
      throw new ValidationError(
        `This account already signs in with ${oidc.providerName}`,
      );
    }

    // It cannot be undone, so a borrowed session is not enough to do it
    const { password } = req.body.user || {};
    if (!password) throw new FieldRequiredError("Your current password");
    if (!(await bcryptCompare(password, loggedUser.password))) {
      throw new ValidationError("Wrong password");
    }

    const url = await oidc.startAuthorization(res, {
      intent: "migrate",
      userId: loggedUser.id,
    });

    res.json({ url });
  } catch (error) {
    next(error);
  }
};

//? Where the third party sends the browser back to
const callback = async (req, res) => {
  const redirect = (params) =>
    res.redirect(
      `${oidc.appUrl}/#/auth/callback?${new URLSearchParams(params)}`,
    );

  try {
    const { claims, intent, userId, idToken, accessToken } =
      await oidc.completeAuthorization(req, res);

    const migrating = intent === "migrate";
    const user = migrating
      ? await migrate(userId, claims)
      : await signInOrSignUp(claims);
    await recordLogin(user, oidc.providerName);

    const code = crypto.randomBytes(32).toString("base64url");
    await Session.destroy({
      where: {
        handoffHash: { [Op.ne]: null },
        createdAt: { [Op.lt]: handoffCutoff() },
      },
    });
    await Session.create({
      userId: user.id,
      idToken,
      accessToken,
      handoffHash: sha256(code),
    });
    oidc.setCookie(res, HANDOFF_COOKIE, code, HANDOFF_TTL_SECONDS);

    redirect(migrating ? { migrated: 1 } : {});
  } catch (error) {
    console.log(error);

    redirect({ error: error instanceof SignInError ? error.code : "failed" });
  }
};

//? Trade the one-time code left by the callback for the logged-in user
const createSession = async (req, res, next) => {
  try {
    const code = oidc.takeCookie(req, res, HANDOFF_COOKIE);

    const pending = {
      handoffHash: sha256(code || ""),
      createdAt: { [Op.gt]: handoffCutoff() },
    };
    const session = code && (await Session.findOne({ where: pending }));
    const [claimed] = session
      ? await Session.update(
          { handoffHash: null },
          { where: { ...pending, id: session.id } },
        )
      : [0];
    if (!claimed) {
      throw new ValidationError(
        "Your sign-in attempt expired, please try again",
      );
    }

    const user = await User.findByPk(session.userId);
    user.dataValues.token = await jwtSign({
      username: user.username,
      sid: session.id,
    });
    appendAccountInfo(user);

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

//* Log out, and out of the third party for accounts that sign in with one
const logout = async (req, res, next) => {
  try {
    const { loggedUser, session } = req;
    if (!loggedUser) throw new UnauthorizedError();

    let redirect = null;
    if (session) {
      await session.destroy();

      try {
        redirect = await oidc.endProviderSession(session);
      } catch (error) {
        // Our own session is gone either way
        console.log(error);
      }
    }

    res.json({ redirect });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  callback,
  createSession,
  logout,
  provider,
  startLogin,
  startMigration,
};
