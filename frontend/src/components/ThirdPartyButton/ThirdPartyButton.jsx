import useAuthProvider from "../../hooks/useAuthProvider";

/** Sign in, or sign up on the first visit, with the third-party provider. */
function ThirdPartyButton({ action }) {
  const provider = useAuthProvider();

  if (!provider) return null;

  return (
    <div className="third-party-auth">
      <hr />
      <a className="btn btn-lg btn-outline-primary" href="api/auth/login">
        {action} with {provider.name}
      </a>
    </div>
  );
}

export default ThirdPartyButton;
