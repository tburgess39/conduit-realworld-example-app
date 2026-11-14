import { createContext, useContext, useEffect, useState } from "react";
import getUser from "../services/getUser";
import userLogout from "../services/userLogout";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const loggedIn = JSON.parse(localStorage.getItem("loggedUser"));

const authState = {
  headers: null,
  isAuth: false,
  loggedUser: {
    bio: null,
    email: "",
    image: null,
    token: "",
    username: "",
  },
};

function AuthProvider({ children }) {
  const [{ headers, isAuth, loggedUser }, setAuthState] = useState(
    loggedIn || authState,
  );

  useEffect(() => {
    if (!headers) return;

    // A newer login may have replaced the token while the request was pending
    const ifCurrent = (update) => (prev) =>
      prev.headers === headers ? update(prev) : prev;

    getUser({ headers })
      .then((loggedUser) =>
        setAuthState(ifCurrent((prev) => ({ ...prev, loggedUser }))),
      )
      .catch((error) => {
        console.error(error);

        // The session ended on the server (e.g. the account was migrated to
        // third-party sign in from another device): end it here as well
        if (error.response?.status === 401) setAuthState(ifCurrent(userLogout));
      });
  }, [headers, setAuthState]);

  return (
    <AuthContext.Provider value={{ headers, isAuth, loggedUser, setAuthState }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
