import React from 'react';
import { Form, Button, Container, Row, Col, Card } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import styles from '../styles/order-summary.module.css';
import useGlobalStore from '@/store/global-store';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLIC_KEY);

const OrderSummary = ({ onBack }) => {
    const orderTotal = 500; // Fixed order total for demonstration
    const {
        fullServiceScript,
        fullServiceAdLength,
        fullServiceNumVoices,
        selectedVoices,
        setSelectedVoices,
        additionalComments,
        setAdditionalComments,
        musicStyle, setMusicStyle,
        includeSFX, setIncludeSFX

    } = useGlobalStore();

    const handlePayment = async () => {
        const stripe = await stripePromise;

        const response = await fetch('/api/Stripe/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: orderTotal * 100, // Stripe expects amount in cents
            }),
        });

        const session = await response.json();

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });

        if (result.error) {
            console.error(result.error.message);
        }
    };

    return (
        <div className={styles.whiteBackgroundContainer}>
            <Container className={`${styles.orderContainer} mt-5`}>
                <Row className="justify-content-center">
                    <Col md={8} className={styles.orderContent}>
                        <h2 className={styles.orderTitle}>Order Summary</h2>
                        <Form className={styles.orderForm}>
                            <Form.Group className="mb-4">
                                <Form.Label className={styles.formLabel}>Script</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={fullServiceScript}
                                    readOnly
                                    className={styles.textarea}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className={styles.formLabel}>Ad Length</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={fullServiceAdLength}
                                    readOnly
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className={styles.formLabel}>Selected Voices</Form.Label>
                                <Card className="mb-4">
                                    <Card.Body>
                                        <Card.Text>
                                            {[...new Set(selectedVoices.map(voice => voice.name).filter(name => name))].join(', ')}
                                        </Card.Text>
                                    </Card.Body>
                                </Card>
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className={styles.formLabel}>Music Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    value={musicStyle}
                                    readOnly
                                />
                            </Form.Group>

                            <div className={styles.orderFooter}>
                                <span className={styles.orderTotal}>Total: ${orderTotal}</span>
                                <div className={styles.buttonGroup}>
                                    <Button variant="light" onClick={onBack} className={styles.orderButton}>
                                        Go Back
                                    </Button>
                                    <Button
                                        variant="warning"
                                        className={`${styles.orderButton} ${styles.payNowButton}`}
                                        onClick={handlePayment}
                                    >
                                        Pay Now
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default OrderSummary;
