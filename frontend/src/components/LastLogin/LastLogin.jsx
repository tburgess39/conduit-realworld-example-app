import { useAuth } from "../../context/AuthContext";
import dateTimeFormatter from "../../helpers/dateTimeFormatter";

const describe = ({ at, method }) => `${dateTimeFormatter(at)} via ${method}`;

/** When, and how, the user logged in before the current session. */
function LastLogin({ className }) {
  const { currentLogin, lastLogin } = useAuth().loggedUser || {};

  // Nothing recorded for sessions older than the feature
  if (!currentLogin) return null;

  return (
    <div className={`last-login ${className || ""}`}>
      Last login: {lastLogin ? describe(lastLogin) : "none before this session"}
    </div>
  );
}

export default LastLogin;
