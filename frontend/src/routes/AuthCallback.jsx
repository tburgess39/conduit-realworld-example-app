import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthPageContainer from "../components/AuthPageContainer";
import { useAuth } from "../context/AuthContext";
import useAuthProvider from "../hooks/useAuthProvider";
import sessionLogin from "../services/sessionLogin";

const errorMessages = (name) => ({
  already_migrated: `This account already signs in with ${name}`,
  email_exists: `An account with this email already exists. Sign in with your password, then migrate it to ${name} from Settings`,
  email_missing: `${name} did not share a verified email address`,
  expired: "Your sign-in attempt expired, please try again",
  identity_taken: `That ${name} account is already linked to another account`,
});

/** Where a third-party sign in (or migration) lands back in the app. */
function AuthCallback() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("error");
  const migrated = searchParams.has("migrated");

  const [loginError, setLoginError] = useState();
  const { isAuth, setAuthState } = useAuth();
  const { name } = useAuthProvider() || { name: "the provider" };
  const navigate = useNavigate();
  const exchanged = useRef(false);

  useEffect(() => {
    // It only works once, and StrictMode runs effects twice
    if (errorCode || exchanged.current) return;
    exchanged.current = true;

    sessionLogin()
      .then(setAuthState)
      .then(() => navigate(migrated ? "/settings" : "/", { replace: true }))
      .catch(setLoginError);
  }, [errorCode, migrated, navigate, setAuthState]);

  const error =
    loginError ||
    (errorCode &&
      (errorMessages(name)[errorCode] ||
        `Could not sign in with ${name}, please try again`));

  return (
    <AuthPageContainer
      error={error}
      path={isAuth ? "/settings" : "/login"}
      text={error && (isAuth ? "Back to your settings" : "Back to sign in")}
      title={error ? "Sign in failed" : "Signing you in..."}
    />
  );
}

export default AuthCallback;
