import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getUser({ headers }) {
  try {
    const { data } = await axios({ headers, url: "api/user" });

    return data.user;
  } catch (error) {
    // Lets the caller tell a token the server rejects from other failures
    if (error.response?.status === 401) throw error;

    errorHandler(error);
  }
}

export default getUser;
