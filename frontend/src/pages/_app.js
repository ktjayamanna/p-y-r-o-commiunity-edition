import { AuthProvider } from "../context/auth";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import Head from "next/head";
import "../styles/globals.css";

// Initialize PostHog only on the client side
if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

function MyApp({ Component, pageProps }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <AuthProvider>
        <Head>
          {/* Include Poppins font from Google Fonts */}
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap"
            rel="stylesheet"
          />
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css"
          />
          <style>
            {`
              body {
                background-color: #343a40;
                font-family: 'Poppins', sans-serif; /* Apply Poppins font */
              }
            `}
          </style>
        </Head>
        <div
          style={{
            backgroundColor: "#343a40",
            minHeight: "100vh",
            opacity: opacity,
            transition: "opacity 0.5s ease",
          }}
        >
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    </PostHogProvider>
  );
}

export default MyApp;
