// VoiceOverPanel/EditVoiceOver.js
import React, { useState, useEffect } from 'react';
import { Card, Form, Dropdown, Button } from 'react-bootstrap';
import styles from '../styles/EditVoiceOver.module.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import useGlobalStore from "@/store/global-store";

const EditVoiceOver = ({
    selectedEmotion,
    emotions,
    handleSelect,
    toggleVoiceSelection,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const {
        setActiveTab,
        sectionsArray,
        setSectionsArray,
        activeSectionIndex,
    } = useGlobalStore();

    // Get the current section based on activeSectionIndex
    const currentSection = sectionsArray[activeSectionIndex];

    // Set default speech rate, intonation consistency level, and emotion if undefined
    const [speechRate, setSpeechRate] = useState(currentSection?.content?.speechRate || 0);
    const [intonationConsistencyLevel, setIntonationConsistencyLevel] = useState(currentSection?.content?.intonationConsistencyLevel || 0);
    const [emotion, setEmotion] = useState(currentSection?.content?.emotion || emotions[0]);
    const [voiceName, setVoiceName] = useState(currentSection?.content?.voiceName || '');

    useEffect(() => {
        setSpeechRate(currentSection?.content?.speechRate || 0);
        setIntonationConsistencyLevel(currentSection?.content?.intonationConsistencyLevel || 0);
        setEmotion(currentSection?.content?.emotion || emotions[0]);
        setVoiceName(currentSection?.content?.voiceName || '');
    }, [activeSectionIndex]);

    const handleClose = () => {
        setIsOpen(false);
        setActiveTab('');
    };

    const handleSpeechRateChange = (e) => {
        const newRate = e.target.value;
        setSpeechRate(newRate);

        // Update the sectionsArray with the new speech rate
        const updatedSectionsArray = [...sectionsArray];
        updatedSectionsArray[activeSectionIndex].content.speechRate = newRate;
        setSectionsArray(updatedSectionsArray);
    };

    const handleIntonationConsistencyLevelChange = (e) => {
        const newIntonationConsistencyLevel = e.target.value;
        setIntonationConsistencyLevel(newIntonationConsistencyLevel);

        // Update the sectionsArray with the new intonation consistency level
        const updatedSectionsArray = [...sectionsArray];
        updatedSectionsArray[activeSectionIndex].content.intonationConsistencyLevel = newIntonationConsistencyLevel;
        setSectionsArray(updatedSectionsArray);
    };

    const handleEmotionChange = (newEmotion) => {
        setEmotion(newEmotion);

        // Update the sectionsArray with the new emotion
        const updatedSectionsArray = [...sectionsArray];
        updatedSectionsArray[activeSectionIndex].content.emotion = newEmotion;
        setSectionsArray(updatedSectionsArray);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Card style={{ width: '300px' }}>
            <Card.Body className="p-3" >
                <div className="d-flex justify-content-between align-items-center">
                    <Card.Title className="mb-0 fw-bold" style={{ fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif", }}>Edit Voice Over</Card.Title>
                    <Button
                        variant="light"
                        onClick={handleClose}
                        className={styles.closeButton}
                    >
                        <i className="bi bi-x-lg"></i>
                    </Button>
                </div>
                <Form>
                    <hr className="my-3" />
                    <Form.Group className="mb-2 d-flex align-items-center">
                        <Form.Label className="me-auto mb-0">Voice</Form.Label>
                        <div
                            className={`d-flex align-items-center ${styles.voiceSelector}`}
                            onClick={toggleVoiceSelection}
                        >
                            <span className="me-2">{voiceName}</span>
                            <i className="bi-chevron-right"></i>
                        </div>
                    </Form.Group>
                    <hr className="my-3" />
                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex justify-content-between w-100">
                            <span>Speed</span>
                            <span>{speechRate}%</span>
                        </Form.Label>
                        <Form.Range
                            value={speechRate}
                            onChange={handleSpeechRateChange}
                            min={0}
                            max={100}
                        />
                    </Form.Group>
                    <hr className="my-3" />
                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex justify-content-between w-100">
                            <span>Variability</span>
                            <span>{intonationConsistencyLevel}%</span>
                        </Form.Label>
                        <Form.Range
                            value={intonationConsistencyLevel}
                            onChange={handleIntonationConsistencyLevelChange}
                            min={0}
                            max={100}
                        />
                    </Form.Group>
                    <hr className="my-3" />
                    <Form.Group>
                        <Form.Label>Emotion</Form.Label>
                        <Dropdown className="w-100">
                            <Dropdown.Toggle
                                variant="light"
                                className="w-100 text-start d-flex justify-content-between align-items-center"
                            >
                                {emotion}
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="w-100">
                                {emotions.map((emotionOption, index) => (
                                    <Dropdown.Item
                                        key={index}
                                        onClick={() => handleEmotionChange(emotionOption)}
                                    >
                                        {emotionOption}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>
                    </Form.Group>
                    <hr className="my-3" />
                </Form>
            </Card.Body>
        </Card>
    );
};

export default EditVoiceOver;
