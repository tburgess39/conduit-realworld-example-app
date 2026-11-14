import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import useAuthProvider from "../../hooks/useAuthProvider";
import userMigrate from "../../services/userMigrate";
import FormFieldset from "../FormFieldset";

/**
 * How the account signs in. Password accounts can be moved to the third-party
 * provider from here; there is deliberately no way back.
 */
function ThirdPartyMigration() {
  const { headers, loggedUser } = useAuth();
  const provider = useAuthProvider();
  const [password, setPassword] = useState("");
  const [error, setError] = useState();
  const [pending, setPending] = useState(false);

  if (loggedUser.authProvider) {
    return (
      <p className="sign-in-method">
        This account signs in with <strong>{loggedUser.authProvider}</strong>.
        It has no password, and this cannot be changed.
      </p>
    );
  }

  if (!provider) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setPending(true);

    userMigrate({ headers, password })
      .then((url) => window.location.assign(url))
      .catch((error) => {
        setError(error);
        setPending(false);
      });
  };

  return (
    <form className="sign-in-method" onSubmit={handleSubmit}>
      <h4>Migrate to {provider.name} sign in</h4>
      <p>
        Sign in with your {provider.name} account instead of a password.{" "}
        <strong>This is permanent:</strong> your password is deleted and the
        account can never go back to signing in with one.
      </p>

      {error && (
        <ul className="error-messages">
          <li>{error}</li>
        </ul>
      )}

      <FormFieldset
        type="password"
        name="currentPassword"
        required
        placeholder="Current password, to confirm"
        value={password}
        handler={(e) => setPassword(e.target.value)}
      ></FormFieldset>

      <label>
        <input type="checkbox" required /> I understand this cannot be undone
      </label>

      <button
        className="btn btn-outline-danger pull-xs-right"
        disabled={pending}
      >
        Migrate to {provider.name}
      </button>
    </form>
  );
}

export default ThirdPartyMigration;
