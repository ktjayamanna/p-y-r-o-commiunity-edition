import { useState } from "react";
import { useRouter } from "next/router";

import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import app from "@/firebase";

import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Image from "next/image";

import { getSubscriptionStatus } from "../stripe-proxy-sdk";
import { usePostHog } from "posthog-js/react";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = getAuth();
  const posthog = usePostHog();

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSignIn = async (event) => {
    event.preventDefault();

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        var user = userCredential.user;

        // Check the subscription status before proceeding
        try {
          const isSubscribed = await getSubscriptionStatus(app);
          if (!isSubscribed) {
            throw new Error("You must have an active subscription to log in.");
          }

          // If the user has an active subscription and verified email, redirect to the quick-script-to-ad/create-ad page
          router.push("/home");
        } catch (error) {
          toast.error(`Subscription Required: ${error.message}. Contact gcahill@firebaystudios.com for more information.`);
        }
      })
      .catch((error) => {
        toast.error("Login Failed: User not found, please sign in.");
      });
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast.warn("Please enter an email address.");
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        toast.success("Password reset email sent. Please check your email.");
      })
      .catch((error) => {
        toast.error(`Error: ${error.message}`);
      });
  };

  return (
    <Container
      fluid
      className="vh-100 d-flex justify-content-center align-items-center"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <Row className="w-100">
        <Col md={6} className="mx-auto">
          <Card
            className="my-5 mx-1 p-4"
            style={{
              borderRadius: "1rem",
              borderColor: "#eb631c",
              color: "white",
            }}
          >
            <Image
              src="/fire.png"
              alt="Firebay Studios"
              width={100}
              height={100}
              className="d-block mx-auto mb-3"
            />

            <h2 className="text-center mb-4" style={{ color: "black" }}>
              Pyro Login
            </h2>
            <p className="text-center mb-5" style={{ color: "black" }}>
              Please enter your login with your email and password!
            </p>

            {/* @TDebt: The below werid block overrides the autofill color of the input fields. Can't figure out the proper way to do it.  */}
            <style jsx global>{`
              input:-webkit-autofill,
              input:-webkit-autofill:focus,
              input:-webkit-autofill:hover {
                -webkit-box-shadow: 0 0 0 1000px #e4e4e4 inset;
                box-shadow: 0 0 0 1000px #e4e4e4 inset;
                -webkit-text-fill-color: #555555 !important;
                color: #555555 !important;
                font-size: 16px; /* Adjust font size as needed */
              }
            `}</style>

            <Form style={{ color: "black" }}>
              <Form.Group controlId="email" className="mb-3">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  style={{
                    borderColor: "#e4e4e4",
                    backgroundColor: "#e4e4e4",
                    color: "black",
                  }}
                />
              </Form.Group>

              <Form.Group controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={handlePasswordChange}
                  minLength={6}
                  required
                  style={{
                    borderColor: "#e4e4e4",
                    backgroundColor: "#e4e4e4",
                    color: "black",
                  }}
                />
              </Form.Group>

              <Form.Group className="text-center small mt-3 mb-3 pb-lg-2">
                <a
                  href="#!"
                  onClick={handleForgotPassword}
                  style={{ color: "#000", fontWeight: "bold" }}
                >
                  Forgot password?
                </a>
              </Form.Group>
              <br />

              <Button
                className="w-100"
                variant="outline-light"
                type="submit"
                size="lg"
                onClick={handleSignIn}
                style={{ backgroundColor: "#EB631C" }}
              >
                Login
              </Button>
            </Form>

            <div className="my-3">
              <p className="text-center" style={{ color: "black" }}>
                Want to become a subscriber?{" "}
                <a
                  href="/signup"
                  style={{ color: "black", fontWeight: "bold" }}
                >
                  Sign Up
                </a>
              </p>
            </div>
            {/* Add the secondary branding at the bottom right corner */}
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                fontSize: "small",
                fontWeight: "bold",
                fontStyle: "italic",
                color: "black",
              }}
            >
              By Firebay Studios
            </div>
          </Card>
        </Col>
      </Row>
      <ToastContainer />
    </Container>
  );
};

export default LoginPage;
