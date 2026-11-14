import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import endSession from "../../services/endSession";
import userLogout from "../../services/userLogout";
import Avatar from "../Avatar";
import LastLogin from "../LastLogin";
import DropdownItem from "./DropdownItem";

function DropdownMenu() {
  const [dropdown, setDropdown] = useState(false);
  const { headers, loggedUser, setAuthState } = useAuth();
  const { username, image } = loggedUser || {};

  const logout = async () => {
    const providerLogoutUrl = await endSession({ headers });

    setAuthState(userLogout);
    // Accounts that sign in with a third party are signed out of it too
    if (providerLogoutUrl) window.location.assign(providerLogoutUrl);
  };

  const handleClick = () => {
    setDropdown((prev) => !prev);
  };

  return (
    <li className="nav-item dropdown">
      <div
        className="nav-link dropdown-toggle cursor-pointer"
        onClick={handleClick}
      >
        <Avatar alt={username} className="user-pic" src={image} />
        {username}
      </div>

      <div
        className="dropdown-menu"
        style={{ display: dropdown ? "block" : "none" }}
        onMouseLeave={handleClick}
      >
        <DropdownItem
          icon="ion-person"
          text="Profile"
          url={`/profile/${username}`}
          state={loggedUser}
        />
        <DropdownItem icon="ion-gear-a" text="Settings" url="/settings" />
        <div className="dropdown-divider"></div>
        <DropdownItem icon="ion-log-out" text="Logout" handler={logout} />
        <LastLogin className="dropdown-item" />
      </div>
    </li>
  );
}

export default DropdownMenu;
