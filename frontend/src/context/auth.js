import { useState, useEffect, useContext, createContext } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app from "@/firebase"; // Ensure this is the updated firebase.js file

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth(app); // Get the Auth instance from the Firebase app
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setError(null); // Reset error on user change
      },
      (error) => {
        setError(error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    error, // Provide error as part of the context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
