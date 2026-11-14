import axios from "axios";

/**
 * Ends the session on the server. Resolves with the URL to visit to also sign
 * out of the third party the account signs in with, if there is one.
 * Never rejects: logging out locally must always be possible.
 */
async function endSession({ headers }) {
  try {
    const { data } = await axios({
      headers,
      method: "POST",
      url: "api/auth/logout",
    });

    return data.redirect;
  } catch (error) {
    console.error(error);

    return null;
  }
}

export default endSession;
