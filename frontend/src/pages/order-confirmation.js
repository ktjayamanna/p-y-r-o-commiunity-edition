// pages/order-confirmation.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';  // For navigation
import styles from '../_pages/order-confirmation/styles/OrderConfirmation.module.css'; // Import CSS module

const OrderConfirmation = () => {
  const router = useRouter();
  const { session_id } = router.query;  // Get session_id from query params
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (session_id) {
        try {
          const res = await fetch(`/api/Stripe/get-checkout-session?session_id=${session_id}`);
          const data = await res.json();
          setSessionDetails(data);
          setLoading(false);
        } catch (err) {
          setError('Failed to load order details.');
          setLoading(false);
        }
      }
    };

    fetchSessionDetails();
  }, [session_id]);

  if (loading) {
    return <p>Loading your order details...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className={styles.confirmationContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.checkmarkContainer}>
          <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none" />
            <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h2 className={styles.confirmationTitle}>Your order has been placed!</h2>
        <p className={styles.confirmationMessage}>
          Thank you for your order! We're excited to bring your ad to life.
          You'll receive the fully produced ad in your email within 24 to 48 hours.
        </p>

        <Link href="/home" className={styles.homeButton}>
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
