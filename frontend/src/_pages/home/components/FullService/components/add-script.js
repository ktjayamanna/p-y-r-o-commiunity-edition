import React, { useState } from 'react';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useGlobalStore from '@/store/global-store';
import styles from '../styles/add-script.module.css';

export default function AddScript({ onNext, onBack }) {
    const {
        fullServiceScript,
        setFullServiceScript,
        fullServiceAdLength,
        setFullServiceAdLength,
    } = useGlobalStore();
    const [showVoiceSelection, setShowVoiceSelection] = useState(false);

    const handleContinue = () => {
        if (!fullServiceScript.trim()) {
            toast.error("Script cannot be empty!", {
                position: "top-center", // Use position as a string
            });
            return; // Prevent continuing if the script is empty
        }
        setShowVoiceSelection(true);
        onNext();
    };


    return (
        <div className={styles.fullWidthWrapper}>
            <Container fluid className={styles.addScriptContainer}>
                <Row className="justify-content-center">
                    <Col className={styles.addScriptContent}>
                        <h2 className={`${styles.addScriptTitle} text-center mb-4`}>
                            Let's start with your script
                        </h2>
                        <Form className={styles.addScriptForm}>
                            <Form.Group controlId="scriptInput" className={styles.formGroup}>
                                <Form.Label>Script</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    placeholder="Enter your script here"
                                    value={fullServiceScript}
                                    onChange={(e) => setFullServiceScript(e.target.value)}
                                    className={styles.scriptTextarea}
                                />
                            </Form.Group>

                            <Form.Group controlId="adLengthDropdown" className={styles.formGroup}>
                                <Form.Label style={{ marginTop: 20 }}>Ad Length</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={fullServiceAdLength}
                                    onChange={(e) => setFullServiceAdLength(e.target.value)}
                                    className={styles.formControl}
                                >
                                    <option value="10">10</option>
                                    <option value="15">15</option>
                                    <option value="30">30</option>
                                    <option value="45">45</option>
                                    <option value="60">60</option>
                                </Form.Control>
                            </Form.Group>

                            <div className={styles.addScriptFooter}>
                                <Button variant="light" onClick={onBack} className={styles.addScriptButton}>
                                    Go Back
                                </Button>
                                <Button
                                    variant="warning"
                                    onClick={handleContinue}
                                    className={`${styles.addScriptButton} ${styles.primary}`}
                                >
                                    Continue
                                </Button>
                            </div>
                        </Form>
                        <ToastContainer /> {/* Add Toastify container */}
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
