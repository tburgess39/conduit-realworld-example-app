import axios from "axios";

let request;

/** The third party users can sign in with, or null when there is none. */
function getAuthProvider() {
  request ??= axios({ url: "api/auth/provider" })
    .then(({ data }) => data.provider)
    .catch((error) => {
      request = undefined;
      console.error(error);

      return null;
    });

  return request;
}

export default getAuthProvider;
