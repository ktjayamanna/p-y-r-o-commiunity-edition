import Swal from 'sweetalert2';
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  getFirestore,
  doc,
  getDoc,
  writeBatch,
  collection,
} from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Container, Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";
import { checkIfExistsInFirestore } from "@/utils/db-read-write-ops/deserialization-utils";

// Initialize Firebase services
const db = getFirestore();
const auth = getAuth();

const SignupPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isEmployee, setIsEmployee] = useState(false);
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (router.query.email) {
      setEmail(router.query.email);
    }
  }, [router.query.email]);

  const handlePasswordChange = (event) => setPassword(event.target.value);

  const handleConfirmPasswordChange = (event) =>
    setConfirmPassword(event.target.value);

  const handleInvoiceNumberChange = (event) =>
    setInvoiceNumber(event.target.value);

  const handleEmployeeCheck = (event) => {
    setIsEmployee(event.target.checked);
    if (event.target.checked) {
      setInvoiceNumber("");
    }
  };

  const handleTrialUserCheck = (event) => setIsTrialUser(event.target.checked);

  async function validateInvoiceNumber(invoiceNumber) {
    try {
      const response = await fetch("/api/Stripe/check-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceNumber }),
      });

      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`Failed to validate invoice number. Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.valid) {
        return true;
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Invoice Number',
          text: 'Please make sure you have entered the correct invoice number.',
        });
        return false;
      }
    } catch (error) {
      console.error("Error validating invoice number:", error);
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'There was a problem validating your invoice number. Please try again later.',
      });
      return false;
    }
  }

  async function validateEmployeeStatus(email) {
    try {
      const validEmployee = await checkIfExistsInFirestore("internal", email);
      if (validEmployee) {
        return validEmployee;
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Employee Email',
          text: 'Please make sure you have entered the correct email address.',
        });
        return false;
      }
    } catch (error) {
      console.error("Error validating employee status:", error);
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'There was a problem validating your employee status. Please try again later.',
      });
      return false;
    }
  }

  async function validateTrialUser(email) {
    try {
      const docRef = doc(db, "pyro_trial_users", email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return true;
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Trial User',
          text: 'The email address is not registered as a trial user.',
        });
        return false;
      }
    } catch (error) {
      console.error("Error validating trial user:", error);
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'There was a problem validating your trial user status. Please try again later.',
      });
      return false;
    }
  }

  const handleSignUp = async (event) => {
    event.preventDefault();
    setIsLoading(true); // Start loading
    setStatusMessage("Creating your Pyro account...");
    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Passwords do not match',
        text: 'Please make sure your passwords match.',
      });
      setIsLoading(false); // Stop loading
      return;
    }
    if (!firstName || !lastName) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please fill in both your first name and last name.',
      });
      setIsLoading(false); // Stop loading
      return;
    }
    const validUser = isEmployee
      ? await validateEmployeeStatus(email)
      : isTrialUser
        ? await validateTrialUser(email)
        : await validateInvoiceNumber(invoiceNumber);
    if (!validUser) {
      setIsLoading(false); // Stop loading
      return;
    }
    try {
      // Directly attempt to create the user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const batch = writeBatch(db);

      const uidToOrgRef = doc(db, "uid_to_org", user.uid);
      batch.set(uidToOrgRef, {
        work_email: email,
        first_name: firstName,
        last_name: lastName,
        monthly_downloads: 0,
        unit_price: 0,
      });

      // Ensure the parent document in 'customers' is created with a dummy field to avoid ghost docs
      const userDocRef = doc(db, "customers", user.uid);
      batch.set(userDocRef, { email: email });

      // Create the subcollection 'subscriptions'
      const subscriptionsRef = collection(userDocRef, "subscriptions");
      const newSubscriptionRef = doc(subscriptionsRef);
      batch.set(newSubscriptionRef, {
        status: "active",
      });

      // Add user_settings document
      const userSettingsRef = doc(db, "user_settings", user.uid);
      batch.set(userSettingsRef, {
        settings_version: 1,
        created_at: new Date(),
      });

      // Add pronunciations subcollection with an example document
      const pronunciationsRef = collection(userSettingsRef, "pronunciations");
      const examplePronunciationRef = doc(pronunciationsRef);
      batch.set(examplePronunciationRef, {
        case_sensitivity: true,
        pronunciation: "Hunday",
        word: "Hyundai",
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error("Batch write error:", error);
        Swal.fire({
          icon: 'error',
          title: 'Account Creation Failed',
          text: 'Unable to save your information. Please try again later.',
        });
        return; // Exit the function if batch commit fails
      }

      setStatusMessage("Your Pyro account has been created.");

      try {
        await router.push("/login"); // Example redirection after successful signup
      } catch (error) {
        console.error("Redirection error:", error);
        Swal.fire({
          icon: 'error',
          title: 'Redirection Failed',
          text: 'Please manually navigate to the login page.',
        });
      }
    } catch (error) {
      console.error("Signup error", error);
      if (error.code === "auth/email-already-in-use") {
        Swal.fire({
          icon: 'error',
          title: 'Email Already in Use',
          text: 'The email address is already in use by another account.',
        });
      } else if (error.code === "auth/network-request-failed") {
        Swal.fire({
          icon: 'error',
          title: 'Network Error',
          text: 'Please check your internet connection and try again.',
        });
      } else if (error.code === "auth/too-many-requests") {
        Swal.fire({
          icon: 'error',
          title: 'Too Many Requests',
          text: 'Please try again later.',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Signup Failed',
          text: error.message,
        });
      }
    } finally {
      setIsLoading(false); // Ensure loading stops in all cases
    }
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        padding: "0",
        backgroundColor: "#FFFFFF",
        margin: "0",
      }}
    >
      {isLoading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            textAlign: "center",
          }}
        >
          <Spinner
            animation="border"
            role="status"
            style={{ width: "80px", height: "80px", color: "#EB631C" }}
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p style={{ marginTop: "100px", marginLeft: "25px", color: "black" }}>
            {statusMessage}
          </p>
        </div>
      ) : (
        <Row className="w-100">
          <Col md={8} lg={6} className="mx-auto">
            <Card
              className="my-3 mx-1 p-3"
              style={{
                borderColor: "#eb631c",
                borderRadius: "0.5rem",
                color: "black",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "5px",
                  left: "5px",
                  fontSize: "small",
                }}
              >
                Step 1 of 2
              </div>
              <Image
                src="/fire.png"
                alt="Firebay Studios"
                width={80}
                height={80}
                className="d-block mx-auto mb-2"
              />
              <h4 className="text-center mb-3">Pyro Sign Up</h4>
              <p className="text-center mb-4">Let's get you started!</p>

              <Form>
                <Form.Group controlId="firstName" className="mb-2">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    style={{
                      borderColor: "#e4e4e4",
                      backgroundColor: "#e4e4e4",
                      color: "black",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="lastName" className="mb-2">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    style={{
                      borderColor: "#e4e4e4",
                      backgroundColor: "#e4e4e4",
                      color: "black",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="workEmail" className="mb-2">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      borderColor: "#e4e4e4",
                      backgroundColor: "#e4e4e4",
                      color: "black",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="password" className="mb-2">
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

                <Form.Group controlId="confirmPassword" className="mb-2">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    minLength={6}
                    required
                    style={{
                      borderColor: "#e4e4e4",
                      backgroundColor: "#e4e4e4",
                      color: "black",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="invoiceNumber" className="mb-2">
                  <Form.Label>Payment Invoice Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="B51DB03D-0002"
                    value={invoiceNumber}
                    onChange={handleInvoiceNumberChange}
                    pattern="[A-Z0-9]{8}-[0-9]{4}"
                    disabled={isEmployee || isTrialUser}
                    required={!isEmployee && !isTrialUser}
                    style={{
                      borderColor: "#e4e4e4",
                      backgroundColor:
                        isEmployee || isTrialUser ? "#e9ecef" : "#e4e4e4",
                      color: "black",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="isEmployee" className="mb-2">
                  <Form.Check
                    type="checkbox"
                    label="I am a Firebay Studios Employee"
                    checked={isEmployee}
                    onChange={handleEmployeeCheck}
                    disabled={isTrialUser}
                  />
                </Form.Group>

                <Form.Group controlId="isTrialUser" className="mb-2">
                  <Form.Check
                    type="checkbox"
                    label="I am a Trial User"
                    checked={isTrialUser}
                    onChange={handleTrialUserCheck}
                    disabled={isEmployee}
                  />
                </Form.Group>

                <div className="my-2 text-left" style={{ fontSize: "small" }}>
                  By clicking the Sign Up button below, you agree to our&nbsp;
                  <a
                    href="https://www.firebaystudios.com/terms-of-service"
                    target="_blank"
                    style={{
                      textDecoration: "underline",
                      color: "#0d6efd",
                      marginRight: "4px",
                    }}
                  >
                    terms and conditions
                  </a>
                  &nbsp;as well as our&nbsp;
                  <a
                    href="https://www.firebaystudios.com/privacy-policy"
                    target="_blank"
                    style={{
                      textDecoration: "underline",
                      color: "#0d6efd",
                      marginRight: "4px",
                    }}
                  >
                    privacy policy
                  </a>
                  .
                </div>

                <Button
                  className="w-100"
                  style={{ backgroundColor: "#EB631C" }}
                  variant="outline-light"
                  type="submit"
                  size="md"
                  onClick={handleSignUp}
                >
                  Sign Up
                </Button>
              </Form>

              {error && (
                <div className="mt-2">
                  <p className="text-center text-danger">{error}</p>
                </div>
              )}

              <div className="my-2">
                <p className="text-center">
                  Already a subscriber?{" "}
                  <a
                    href="/login"
                    style={{ color: "black", fontWeight: "bold" }}
                  >
                    Login
                  </a>
                </p>
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: "5px",
                  right: "5px",
                  fontSize: "small",
                  fontWeight: "bold",
                  fontStyle: "italic",
                }}
              >
                By Firebay Studios
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default SignupPage;
