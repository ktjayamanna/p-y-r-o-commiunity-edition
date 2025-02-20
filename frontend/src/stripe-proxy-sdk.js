"use client";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export const getCheckoutUrl = async (app, priceId) => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User is not authenticated");

  const db = getFirestore(app);
  const checkoutSessionRef = collection(
    db,
    "customers",
    userId,
    "checkout_sessions"
  );

  const docRef = await addDoc(checkoutSessionRef, {
    price: priceId,
    success_url: window.location.origin + "/login",
    cancel_url: window.location.origin + "/signup",
  });

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const data = snap.data();
      const error = data?.error;
      const url = data?.url;
      if (error) {
        unsubscribe();
        reject(new Error(`An error occurred: ${error.message}`));
      }
      if (url) {
        unsubscribe();
        resolve(url);
      }
    });
  });
};

export const getSubscriptionStatus = async (app) => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User not logged in");

  const db = getFirestore(app);
  const subscriptionsRef = collection(db, "customers", userId, "subscriptions");
  const subscriptionQuery = query(
    subscriptionsRef,
    where("status", "in", ["trialing", "active"])
  );

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(
      subscriptionQuery,
      (snapshot) => {
        // In this implementation we only expect one active or trialing subscription to exist.
        if (snapshot.docs.length === 0) {
          // console.log("No active or trialing subscriptions found");
          resolve(false);
        } else {
          // console.log("Active or trialing subscription found");
          resolve(true);
        }
        unsubscribe();
      },
      (error) => {
        reject(error);
      }
    );
  });
};

export const getPortalUrl = async (app) => {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No user logged in");
  }

  try {
    const functions = getFunctions(app, "us-west2");
    const functionRef = httpsCallable(
      functions,
      "ext-firestore-stripe-payments-createPortalLink"
    );

    const response = await functionRef({
      customerId: user.uid,
      returnUrl: window.location.origin,
      locale: "auto", // Optional, defaults to "auto"
    });

    const dataWithUrl = response.data;

    if (dataWithUrl && dataWithUrl.url) {
      return dataWithUrl.url;
    } else {
      throw new Error("No URL returned");
    }
  } catch (error) {
    // console.error(error);
    throw error;
  }
};

async function findCustomerIdByEmail(email) {
  const response = await fetch("/api/Stripe/find-customer-by-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    // Handle the error
    const errorData = await response.json();
    console.error("Error fetching customer ID:", errorData.error);
    return null;
  }

  const data = await response.json();
  return data.customerId; // This is the ID of the customer
}

export async function stripeTrialAuthenticator(email) {
  try {
    const customerId = await findCustomerIdByEmail(email);
    if (!customerId) {
      return {
        trial: false,
        trialStart: null,
        trialEnd: null,
        message: "No customer found with this email.",
      };
    }

    // Make a POST request to the API endpoint to get subscriptions
    const response = await fetch(
      "/api/Stripe/stripe_enlist_all_subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerId }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data: subscriptions } = await response.json();

    let trialInfo = {
      trial: false,
      trialStart: null,
      trialEnd: null,
      message: "",
    };

    subscriptions.forEach((subscription) => {
      if (subscription.trial_end) {
        const trialEndDate = new Date(subscription.trial_end * 1000);
        const trialStartDate = new Date(subscription.trial_start * 1000);
        // Update trial info if this subscription has the latest trial end date
        if (!trialInfo.trialEnd || trialEndDate > trialInfo.trialEnd) {
          trialInfo.trialEnd = trialEndDate;
          trialInfo.trialStart = trialStartDate;
          // Check if the trial is currently active
          trialInfo.trial = trialEndDate >= new Date();
        }
      }
    });

    return trialInfo;
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    throw error;
  }
}
