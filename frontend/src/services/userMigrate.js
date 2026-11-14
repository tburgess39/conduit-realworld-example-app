import axios from "axios";
import errorHandler from "../helpers/errorHandler";

/**
 * Starts the migration of a password account to third-party sign in.
 * Resolves with the URL where the user confirms it with the third party.
 */
async function userMigrate({ headers, password }) {
  try {
    const { data } = await axios({
      data: { user: { password } },
      headers,
      method: "POST",
      url: "api/auth/migrate",
    });

    return data.url;
  } catch (error) {
    errorHandler(error);
    throw "Could not reach the server, please try again";
  }
}

export default userMigrate;
