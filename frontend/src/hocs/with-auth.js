// src/hocs/withAuth.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/auth";

const withAuth = (WrappedComponent, redirectUrl = "/login") => {
  return (props) => {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (user === null) {
        router.push(redirectUrl);
      }
    }, [user, router, redirectUrl]);

    if (user) {
      return <WrappedComponent {...props} />;
    }

    // Optional: Return null or a loading spinner while waiting for the redirect
    return null; // or <LoadingIndicator />;
  };
};

export default withAuth;
