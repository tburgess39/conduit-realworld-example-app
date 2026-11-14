const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { ValidationError } = require("./customErrors");

/**
 * Why a third-party sign-in could not be completed. Only the code reaches the
 * browser (in the URL), where it is turned into a message.
 */
class SignInError extends Error {
  constructor(code) {
    super(`Third-party sign-in failed: ${code}`);
    this.name = this.constructor.name;
    this.code = code;
  }
}

const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;

const enabled = Boolean(OIDC_ISSUER && OIDC_CLIENT_ID);
const providerName = process.env.OIDC_PROVIDER_NAME || "single sign-on";

// Public origin of the app, as the browser and the provider see it
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const redirectUri = `${appUrl}/api/auth/callback`;

const TX_COOKIE = "oidc_tx";
const TX_TTL_SECONDS = 10 * 60;
const cookieOptions = {
  httpOnly: true,
  path: "/api/auth",
  sameSite: "lax",
  secure: appUrl.startsWith("https:"),
};

/** Keeps a short-lived value in the browser that started a sign-in. */
const setCookie = (res, name, value, ttlSeconds) =>
  res.cookie(name, value, { ...cookieOptions, maxAge: ttlSeconds * 1000 });

/** Reads a cookie set by `setCookie` and clears it: they are single use. */
const takeCookie = (req, res, name) => {
  const pair = (req.headers.cookie || "")
    .split(/;\s*/)
    .find((pair) => pair.startsWith(`${name}=`));
  res.clearCookie(name, cookieOptions);

  try {
    return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
};

// A key of its own, so an in-flight sign-in can never pass for an API token
const txKey = () =>
  crypto.createHmac("sha256", process.env.JWT_KEY).update(TX_COOKIE).digest();

let clientPromise;
/** Loads the (ESM only) client and discovers the provider, once. */
const getClient = () => {
  if (!enabled) throw new ValidationError("Third-party sign-in is not enabled");

  clientPromise ??= (async () => {
    const client = await import("openid-client");
    const issuer = new URL(OIDC_ISSUER);
    const isLocal = ["localhost", "127.0.0.1"].includes(issuer.hostname);

    const config = await client.discovery(
      issuer,
      OIDC_CLIENT_ID,
      OIDC_CLIENT_SECRET,
      OIDC_CLIENT_SECRET ? undefined : client.None(),
      {
        execute: [
          client.enableNonRepudiationChecks,
          // Plain HTTP is only ever accepted for a provider on this machine
          ...(issuer.protocol === "http:" && isLocal
            ? [client.allowInsecureRequests]
            : []),
        ],
      },
    );

    return { client, config };
  })().catch((error) => {
    clientPromise = undefined;
    throw error;
  });

  return clientPromise;
};

/**
 * Starts an authorization code flow (with PKCE) and returns the provider URL
 * to send the browser to. What is needed to finish it stays with the browser,
 * in a signed, short-lived cookie.
 */
const startAuthorization = async (res, { intent, userId }) => {
  const { client, config } = await getClient();

  const verifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const nonce = client.randomNonce();

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: "openid email profile",
    code_challenge: await client.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
    // Linking is permanent: make the user pick the identity explicitly
    // instead of silently reusing whoever is signed in at the provider.
    ...(intent === "migrate" && { prompt: "login" }),
  });

  const tx = jwt.sign({ intent, userId, verifier, state, nonce }, txKey(), {
    expiresIn: TX_TTL_SECONDS,
  });
  setCookie(res, TX_COOKIE, tx, TX_TTL_SECONDS);

  return url.href;
};

const takeTx = (req, res) => {
  try {
    return jwt.verify(takeCookie(req, res, TX_COOKIE), txKey());
  } catch {
    return null;
  }
};

/**
 * Finishes the flow started by `startAuthorization` from the provider's
 * redirect back to us, returning the verified identity and its tokens.
 */
const completeAuthorization = async (req, res) => {
  const tx = takeTx(req, res);
  if (!tx) throw new SignInError("expired");

  const { client, config } = await getClient();

  const tokens = await client.authorizationCodeGrant(
    config,
    new URL(req.originalUrl, appUrl),
    {
      pkceCodeVerifier: tx.verifier,
      expectedState: tx.state,
      expectedNonce: tx.nonce,
      idTokenExpected: true,
    },
  );

  let claims = tokens.claims();
  const { end_session_endpoint, revocation_endpoint, userinfo_endpoint } =
    config.serverMetadata();

  // Providers may keep profile claims out of the ID token
  if (!claims.email && userinfo_endpoint) {
    const userInfo = await client.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub,
    );
    claims = { ...userInfo, ...claims };
  }

  return {
    claims,
    intent: tx.intent,
    userId: tx.userId,
    idToken: tokens.id_token,
    // Only worth keeping when revoking it is how we sign out of the provider
    accessToken:
      !end_session_endpoint && revocation_endpoint ? tokens.access_token : null,
  };
};

/**
 * Signs out of the provider. Returns the URL the browser must visit to end
 * its session there (RP-initiated logout); for providers without one, the
 * access they granted is revoked instead and null is returned.
 */
const endProviderSession = async ({ idToken, accessToken }) => {
  const { client, config } = await getClient();
  const { end_session_endpoint, revocation_endpoint } = config.serverMetadata();

  if (end_session_endpoint) {
    return client.buildEndSessionUrl(config, {
      id_token_hint: idToken,
      post_logout_redirect_uri: `${appUrl}/`,
    }).href;
  }

  if (revocation_endpoint && accessToken) {
    await client.tokenRevocation(config, accessToken);
  }

  return null;
};

module.exports = {
  SignInError,
  appUrl,
  completeAuthorization,
  enabled,
  endProviderSession,
  providerName,
  setCookie,
  startAuthorization,
  takeCookie,
};
