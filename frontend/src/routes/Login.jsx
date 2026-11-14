import { useState } from "react";
import AuthPageContainer from "../components/AuthPageContainer";
import LoginForm from "../components/LoginForm";
import ThirdPartyButton from "../components/ThirdPartyButton";

function Login() {
  const [errorMessage, setErrorMessage] = useState();

  const handleError = (error) => {
    setErrorMessage(error);
  };

  return (
    <AuthPageContainer
      error={errorMessage}
      path="/register"
      text="Need an account?"
      title="Sign in"
    >
      <LoginForm onError={handleError} />
      <ThirdPartyButton action="Sign in" />
    </AuthPageContainer>
  );
}

export default Login;
