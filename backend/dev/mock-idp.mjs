/**
 * A throwaway OpenID Connect provider, for trying third-party sign-in locally
 * without registering the app anywhere. DEVELOPMENT ONLY: it signs anyone in
 * as whoever they claim to be, with any password.
 *
 *   npm run dev:idp
 */
import Provider from "oidc-provider";

if (process.env.NODE_ENV === "production") {
  console.error("The mock identity provider must never run in production.");
  process.exit(1);
}

const PORT = process.env.MOCK_IDP_PORT || 3002;
const ISSUER = `http://localhost:${PORT}`;
const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const provider = new Provider(ISSUER, {
  clients: [
    {
      client_id: "conduit-dev",
      client_secret: "conduit-dev-secret",
      redirect_uris: [`${APP_URL}/api/auth/callback`],
      post_logout_redirect_uris: [`${APP_URL}/`],
    },
  ],
  claims: {
    openid: ["sub"],
    email: ["email", "email_verified"],
    profile: ["preferred_username"],
  },
  // The login typed in the sign-in form is the account
  findAccount: (ctx, sub) => ({
    accountId: sub,
    claims: () => ({
      sub,
      email: sub.includes("@") ? sub : `${sub}@mock-idp.test`,
      email_verified: true,
      preferred_username: sub.split("@")[0],
    }),
  }),
  features: {
    rpInitiatedLogout: {
      // Sign out straight away instead of asking for confirmation
      logoutSource: (ctx, form) => {
        ctx.body = `<!DOCTYPE html>
          <html>
            <body>
              ${form}
              <input type="hidden" name="logout" value="yes" form="op.logoutForm" />
              <script>document.getElementById("op.logoutForm").submit();</script>
              <noscript>
                <button type="submit" form="op.logoutForm">Sign out</button>
              </noscript>
            </body>
          </html>`;
      },
    },
  },
});

provider.listen(PORT, () =>
  console.log(`Mock identity provider running on ${ISSUER}`),
);
