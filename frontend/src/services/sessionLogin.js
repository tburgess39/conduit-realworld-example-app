import axios from "axios";
import errorHandler from "../helpers/errorHandler";

/**
 * Finishes a third-party sign in: trades the one-time cookie the server left
 * in this browser for the logged-in user.
 */
async function sessionLogin() {
  try {
    const { data } = await axios({
      method: "POST",
      url: "api/auth/session",
    });

    const { user } = data;
    const headers = { Authorization: `Token ${user.token}` };

    const loggedIn = { headers, isAuth: true, loggedUser: user };

    localStorage.setItem("loggedUser", JSON.stringify(loggedIn));

    return loggedIn;
  } catch (error) {
    errorHandler(error);
    throw "Could not reach the server, please try again";
  }
}

export default sessionLogin;
