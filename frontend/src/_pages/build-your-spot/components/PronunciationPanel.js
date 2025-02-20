import React, { useState, useEffect } from 'react';
import { Button, Form, ListGroup, Card, Spinner, Modal } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../styles/PronunciationPanel.module.css';
import useGlobalStore from "@/store/global-store";
import {
    getFirestore,
    doc,
    collection,
    addDoc,
    deleteDoc,
    getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import app from "@/firebase";
import { generateVoiceWithElevenLabsAPI } from "@/middleware/tts";
import Swal from 'sweetalert2';


// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

const PronunciationPanel = () => {
    const user = auth.currentUser;
    const [isOpen, setIsOpen] = useState(true);
    const {
        activeTab,
        setActiveTab,
        setCurrentAudioUrl,
        setAudioPlayerForceRenderKey,
        setAudioPlayerAutoPlay,
        customPronunciations,
        setCustomPronunciations,
    } = useGlobalStore();
    const [word, setWord] = useState('');
    const [pronunciation, setPronunciation] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatingAudioFor, setGeneratingAudioFor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [generatingAudioForModal, setGeneratingAudioForModal] = useState(false);

    useEffect(() => {
        if (user) {
            fetchUserPronunciations();
        }
    }, [user]);

    const fetchUserPronunciations = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const userSettingsDoc = doc(db, 'user_settings', user.uid);
            const pronunciationsCollection = collection(userSettingsDoc, 'pronunciations');
            const querySnapshot = await getDocs(pronunciationsCollection);

            if (querySnapshot.size === 0) {
                console.log("No pronunciations found for the user.");
                setCustomPronunciations([]);
            } else {
                const pronunciations = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setCustomPronunciations(pronunciations);
            }
        } catch (error) {
            toast.error("Failed to fetch pronunciations. Maybe try again when the universe aligns?");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setActiveTab('');
    };

    const handleAdd = async () => {
        if (!word || !pronunciation) {
            Swal.fire({
                icon: 'error',
                title: 'Incomplete Input',
                text: "Fill in both fields, it's not rocket science!",
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
            return;
        }

        if (word.length > 50 || pronunciation.length > 50) {
            Swal.fire({
                icon: 'error',
                title: 'Character Limit Exceeded',
                text: 'Word and pronunciation should not exceed 50 characters.',
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
            return;
        }

        setLoading(true);
        try {
            const userSettingsDoc = doc(db, 'user_settings', user.uid);
            const pronunciationsCollection = collection(userSettingsDoc, 'pronunciations');
            await addDoc(pronunciationsCollection, {
                word,
                pronunciation,
                case_sensitivity: caseSensitive,
                createdAt: new Date(),
            });

            setCustomPronunciations([...customPronunciations, {
                id: Date.now().toString(),
                word,
                pronunciation,
                case_sensitivity: caseSensitive,
            }]);

            setWord('');
            setPronunciation('');
            setCaseSensitive(false);
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: "Pronunciation added successfully! You're on fire!",
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to add pronunciation.',
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setLoading(true);
        try {
            const userSettingsDoc = doc(db, 'user_settings', user.uid);
            const pronunciationDoc = doc(userSettingsDoc, 'pronunciations', id);
            await deleteDoc(pronunciationDoc);

            setCustomPronunciations(customPronunciations.filter(item => item.id !== id));

            Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: "Pronunciation removed successfully!",
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Deletion Failed',
                text: 'Failed to delete pronunciation.',
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePronounciationPlay = async (pronunciation, id) => {
        setGeneratingAudioFor(id);
        try {
            const result = await generateVoiceWithElevenLabsAPI(
                pronunciation,
                'eleven_multilingual_v2',
                '6wLJ4Wm2OxvAvetEUBCS',
                0
            );
            const audioUrl = result.audioUrl;
            setCurrentAudioUrl(audioUrl);
            setAudioPlayerAutoPlay(true);
            setAudioPlayerForceRenderKey(Math.random());
        } catch (error) {
            toast.error("Failed to generate audio.");
        } finally {
            setGeneratingAudioFor(null);
        }
    };

    const handlePronounciationPlayModal = async () => {
        if (!selectedItem) return;

        setGeneratingAudioForModal(true);
        try {
            const result = await generateVoiceWithElevenLabsAPI(
                selectedItem.pronunciation,
                'eleven_multilingual_v2',
                '6wLJ4Wm2OxvAvetEUBCS',
                0
            );
            const audioUrl = result.audioUrl;
            setCurrentAudioUrl(audioUrl);
            setAudioPlayerAutoPlay(true);
            setAudioPlayerForceRenderKey(Math.random());
        } catch (error) {
            toast.error("Failed to generate audio.");
        } finally {
            setGeneratingAudioForModal(false);
        }
    };

    const handleShowModal = (item) => {
        setSelectedItem(item);
        setShowModal(true);
    };

    const handleCloseModal = () => setShowModal(false);

    const truncate = (text, maxLength) => {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    };

    if (!isOpen) {
        return null;
    }

    const getModalSize = (contentLength) => {
        if (contentLength > 50) return 'xl';
        if (contentLength > 30) return 'lg';
        if (contentLength > 10) return 'md';
        return 'sm';
    };

    const contentLength = selectedItem ? (selectedItem.word.length + (selectedItem.pronunciation ? selectedItem.pronunciation.length : 0)) : 0;

    return (
        <div className={styles.pronunciationColumn}>
            <ToastContainer
                position="top-right"
                style={{ marginTop: '50px' }}
                autoClose={3000}
                toastStyle={{
                    backgroundColor: '#eb631c',
                    color: 'white',
                }}
                progressStyle={{ backgroundColor: 'white' }}
            />
            <div className={`${styles.pronunciationHeader} d-flex justify-content-between align-items-center`}>

                <h3 className="mb-0 fw-bold" style={{ fontSize: '1.25rem' }}>Pronunciations</h3>
                <Button
                    variant="light"
                    onClick={handleClose}
                >
                    <i className="bi bi-x-lg"></i>
                </Button>
            </div>

            <div className={styles.pronunciationBody}>
                <Form className="mb-3">
                    <Form.Control
                        type="text"
                        placeholder="Word"
                        className="mb-2"
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        maxLength={50}
                    />
                    <Form.Control
                        type="text"
                        placeholder="Pronunciation"
                        className="mb-2"
                        value={pronunciation}
                        onChange={(e) => setPronunciation(e.target.value)}
                        maxLength={50}
                    />
                    <Form.Check
                        type="checkbox"
                        label="Case sensitive?"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="mb-2"
                    />
                    <Button variant="light" onClick={handleAdd} disabled={loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : "Add"}
                    </Button>
                </Form>

                <h6>Your custom pronunciations</h6>
                <Card className={styles.pronunciationCard}>
                    <Card.Body className={styles.pronunciationCardBody}>
                        {loading ? (
                            <Spinner animation="border" />
                        ) : (
                            <ListGroup variant="flush">
                                {customPronunciations.length > 0 ? (
                                    customPronunciations.map((item) => (
                                        <ListGroup.Item
                                            key={item.id}
                                            className="d-flex justify-content-between align-items-center"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleShowModal(item)}
                                        >
                                            <div className="d-flex align-items-center">
                                                {generatingAudioFor === item.id ? (
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                ) : (
                                                    <i
                                                        className="bi bi-play-circle me-2"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePronounciationPlay(item.pronunciation, item.id);
                                                        }}
                                                    ></i>
                                                )}
                                                <span style={item.case_sensitivity ? { fontWeight: 'bold', fontStyle: 'italic' } : {}}>
                                                    {truncate(item.word, 6)}
                                                </span>
                                                <small
                                                    className="text-muted ms-2"
                                                    style={item.case_sensitivity ? { fontWeight: 'bold', fontStyle: 'italic' } : {}}
                                                >
                                                    {truncate(item.pronunciation, 6)}
                                                </small>
                                            </div>
                                            <Button
                                                variant="light"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item.id);
                                                }}
                                                disabled={!!generatingAudioFor}
                                            >
                                                <i className="bi bi-x"></i>
                                            </Button>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <p>No custom pronunciations found.</p>
                                )}
                            </ListGroup>
                        )}
                    </Card.Body>
                </Card>
            </div>

            {selectedItem && (
                <Modal show={showModal} onHide={handleCloseModal} centered size={getModalSize(contentLength)}>
                    <Modal.Header closeButton>
                        <Modal.Title style={{ color: '#000' }}>Pronunciation</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="d-flex align-items-center" style={{ gap: '8px', fontSize: '1.2em', color: '#000' }}>
                            {generatingAudioForModal ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <i
                                    className="bi bi-play-circle"
                                    style={{ cursor: 'pointer', fontSize: '1.5em', color: '#000' }}
                                    onClick={handlePronounciationPlayModal}
                                ></i>
                            )}
                            <span style={selectedItem.case_sensitivity ? { fontWeight: 'bold', fontStyle: 'italic', color: '#000' } : {}}>
                                {selectedItem.word}
                            </span>
                            <small className="text-muted">
                                {selectedItem.pronunciation}
                            </small>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>

            )}
        </div>
    );
};

export default PronunciationPanel;
