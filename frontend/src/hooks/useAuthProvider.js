import { useEffect, useState } from "react";
import getAuthProvider from "../services/getAuthProvider";

function useAuthProvider() {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    getAuthProvider().then(setProvider);
  }, []);

  return provider;
}

export default useAuthProvider;
