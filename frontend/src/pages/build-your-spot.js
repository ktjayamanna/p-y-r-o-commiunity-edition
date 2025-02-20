import React, { useState, useRef, useEffect, use } from 'react';
import { Button, Card, Form, Dropdown } from 'react-bootstrap';
import WaveSurfer from 'wavesurfer.js';

// Import data structures
import Section from '../dataStructures/section';
import GeneratedContent from '../dataStructures/GeneratedContent';
import UploadedContent from '../dataStructures/UploadedContent';

// Import styles
import styles from '../_pages/build-your-spot/styles/BuildYourSpot.module.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import components
import FireNavbar from '@/_pages/build-your-spot/components/FireNavbar';
import NotesPanel from '@/_pages/build-your-spot/components/NotesPanel';
import MusicPanel from '@/_pages/build-your-spot/components/MusicPanel';
import PronunciationPanel from '@/_pages/build-your-spot/components/PronunciationPanel';
import VoiceOverPanel from '@/_pages/build-your-spot/components/VoiceOverPanel';
import Menu from '@/_pages/build-your-spot/components/Menu';
import SectionHistory from '@/_pages/build-your-spot/components/SectionHistory';
import SimpleAudioPlayer from '@/_pages/build-your-spot/components/SimpleAudioPlayer';
import WordSmithOffcanvas from '@/_pages/build-your-spot/components/WordSmith';

// Import global store
import useGlobalStore from '@/store/global-store';
import withAuth from "@/hocs/with-auth";
import { getAuth } from "firebase/auth";

import { generateVoiceWithElevenLabsAPI } from "@/middleware/tts";
import { fetchAudioFromPyroBackendDistribution } from "@/utils/fetch-audio/fetch-from-distribution";
import {
    getFirestore,
    doc,
    collection,
    getDocs,
} from "firebase/firestore";
import app from "@/firebase";
import TextareaAutosize from 'react-textarea-autosize';


const db = getFirestore(app);

const BuildYourSpot = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    const {
        activeTab,
        setActiveTab,
        sectionsArray,
        setSectionsArray,
        sectionHistoryArray,
        activeSectionIndex,
        setActiveSectionIndex,
        chosenMusic,
        currentAudioUrl,
        setCurrentAudioUrl,
        audioPlayerForceRenderKey,
        setAudioPlayerForceRenderKey,
        audioPlayerAutoPlay,
        setAudioPlayerAutoPlay,
        customPronunciations,
        setCustomPronunciations,
        generatingIndex,
        setGeneratingIndex
    } = useGlobalStore();

    const [localSectionHistoryArray, setLocalSectionHistoryArray] = useState([...sectionHistoryArray]); // localSectionHistoryArray
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isMusicOpen, setIsMusicOpen] = useState(false);
    const [isPronunciationOpen, setIsPronunciationOpen] = useState(false);
    const [isSectionHistoryOpen, setIsSectionHistoryOpen] = useState(false);
    const [isVoiceOverOpen, setIsVoiceOverOpen] = useState(false);
    const [offcanvasVisible, setOffcanvasVisible] = useState(false);
    const [sections, setSections] = useState(sectionsArray || []);
    const [isScrollable, setIsScrollable] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const notesSectionRef = useRef(null);
    const sectionRefs = useRef([]);
    const waveformRefs = useRef([]);
    const inputRefs = useRef([]);

    const [initialPauseDurationSeconds, setInitialPauseDurationSeconds] = useState(0);
    const audioProcessingWebServiceUrl =
        process.env.NODE_ENV === "development"
            ? "http://localhost:8000"
            : process.env.NEXT_PUBLIC_AUDIO_SERVICES;

    const CHARACTERSPERSEC = 15.2; // Experimentally determined characters per second
    const ADDITIONALWAITTIME = 6000; // 5 seconds; Experimentally determined
    const SECTOMILLISEC = 1000;

    useEffect(() => {
        setCurrentAudioUrl("");
        setAudioPlayerAutoPlay(false);
    }, []);
    useEffect(() => {
        if (user) {
            fetchUserPronunciations();
        }
    }, [user]);

    useEffect(() => {
        setSections(sectionsArray || []);
    }, [sectionsArray]);

    useEffect(() => {
        setSectionsArray(sections);
    }, [sections, setSectionsArray]);

    useEffect(() => {
        if (sections.length > 0 && activeSectionIndex === null) {
            setActiveSectionIndex(0);
        }
    }, [sections, activeSectionIndex]);

    const fetchUserPronunciations = async () => {
        if (!user) return;

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
            console.log("Failed to fetch pronunciations. Maybe try again when the universe aligns?");
        }
    };

    const handleTabChange = (tab) => {
        const isTabActive = activeTab === tab;
        setIsSectionHistoryOpen(false);
        setActiveTab(isTabActive ? '' : tab);
        setIsNotesOpen(tab === 'notes' && !isTabActive);
        setIsMusicOpen(tab === 'music' && !isTabActive);
        setIsPronunciationOpen(tab === 'pronunciation' && !isTabActive);
        setIsVoiceOverOpen(tab === 'voice-over' && !isTabActive);
    };

    const addSection = (index, type) => {
        let content;
        if (type === 'text') {
            content = new GeneratedContent();
        } else if (type === 'audio') {
            content = new UploadedContent();
        }

        const newSection = new Section({
            index: index + 1,
            type: type === 'text' ? 'generated' : 'uploaded',
            content: content,
        });

        const updatedSections = [...sections];
        updatedSections.splice(index + 1, 0, newSection);

        updatedSections.forEach((section, idx) => {
            section.index = idx;
        });

        setSections(updatedSections);

        // Update localSectionHistoryArray
        const updatedLocalSectionHistoryArray = [...localSectionHistoryArray];
        // Insert a new Map at the correct index
        updatedLocalSectionHistoryArray.splice(index + 1, 0, new Map());
        setLocalSectionHistoryArray(updatedLocalSectionHistoryArray);

        sectionRefs.current = updatedSections.map(
            (_, i) => sectionRefs.current[i] || React.createRef()
        );
        inputRefs.current = updatedSections.map(
            (_, i) => inputRefs.current[i] || React.createRef()
        );

        setTimeout(() => {
            checkIfScrollable();
            sectionRefs.current[index + 1]?.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 0);
        setDropdownOpen(null);
    };

    const scrollTo = (position) =>
        notesSectionRef.current?.scrollTo({ top: position, behavior: 'smooth' });

    const updateContent = (index, newContent) => {
        const updatedSections = [...sections];
        const section = updatedSections[index];

        if (section.type === 'generated') {
            section.content.currentContent = newContent;
            section.content.currentCharCount =
                section.content.calculateCharCount(newContent);
            section.content.currentWords = newContent.split(' ');
            section.updateSectionDuration();
            setSections(updatedSections);
            checkIfScrollable();
        }
    };

    const checkIfScrollable = () => {
        const { scrollHeight, clientHeight } = notesSectionRef.current || {};
        setIsScrollable(scrollHeight > clientHeight);
    };

    useEffect(() => {
        checkIfScrollable();
        window.addEventListener('resize', checkIfScrollable);
        return () => window.removeEventListener('resize', checkIfScrollable);
    }, [sections]);

    useEffect(() => setIsMounted(true), []);

    const updateDuration = (index, increment) => {
        const updatedSections = [...sections];
        const section = updatedSections[index];

        const newDuration = Math.max(
            0,
            (section.endOfSectionPauseDurationSeconds || 0) + increment
        );
        section.endOfSectionPauseDurationSeconds = newDuration;

        setSections(updatedSections);
    };

    const handleAudioUpload = async (index, event) => {
        const file = event.target.files[0];
        if (file) {
            const updatedSections = [...sections];
            const section = updatedSections[index];

            if (section.type === 'uploaded') {
                section.content.audioFile = file;
                section.content.audioFileName = file.name;
                await section.updateSectionDuration();
                setSections(updatedSections);
            }
        }
    };

    const handleDuplicate = (index) => {
        if (index < 0 || index >= sections.length) {
            console.error(`Invalid index: ${index}. Cannot duplicate section.`);
            return;
        }

        const originalSection = sections[index];
        const clonedSection = originalSection.clone();

        const updatedSections = [...sections];
        updatedSections.splice(index + 1, 0, clonedSection);

        // Update indices of sections
        updatedSections.forEach((section, idx) => {
            section.index = idx;
        });

        setSections(updatedSections);

        // Update localSectionHistoryArray
        const updatedLocalSectionHistoryArray = [...localSectionHistoryArray];
        const originalHistoryMap = localSectionHistoryArray[index];

        // Option 1: Clone the original history map
        const clonedHistoryMap = new Map(originalHistoryMap);
        updatedLocalSectionHistoryArray.splice(index + 1, 0, clonedHistoryMap);

        setLocalSectionHistoryArray(updatedLocalSectionHistoryArray);
    };


    const handleHistory = (index) => {
        setActiveTab('');
        setIsMusicOpen(false);
        setIsPronunciationOpen(false);
        setIsNotesOpen(false);
        setIsVoiceOverOpen(false);
        setIsSectionHistoryOpen(true);
    };

    const handleEmphasis = (index) => {
        setActiveSectionIndex(index);
        setOffcanvasVisible(true);
    };

    const handleDelete = (index) => {
        const updatedSections = sections.filter((_, idx) => idx !== index);

        updatedSections.forEach((section, idx) => (section.index = idx));

        setSections(updatedSections);
        const updatedLocalSectionHistoryArray = localSectionHistoryArray.filter((_, idx) => idx !== index);
        setLocalSectionHistoryArray(updatedLocalSectionHistoryArray);
        if (updatedSections.length === 0) {
            setIsVoiceOverOpen(false);
        }
    };

    const handleReplay = (index) => {
        const audioBlobUrl = sections[index].content.generatedVoiceUrl;
        setCurrentAudioUrl(audioBlobUrl);
        setAudioPlayerForceRenderKey(Math.random());
        setAudioPlayerAutoPlay(true);
    };

    const handleSectionAudioDownload = (index) => {
        const audioBlobUrl = sections[index].content.generatedVoiceUrl;

        if (audioBlobUrl) {
            // Create an anchor element
            const link = document.createElement('a');
            link.href = audioBlobUrl;
            link.download = `section-${index}-audio.mp3`; // Set a default file name

            // Append the anchor to the document body
            document.body.appendChild(link);

            // Programmatically click the anchor to trigger the download
            link.click();

            // Clean up by removing the anchor element from the document
            document.body.removeChild(link);
        } else {
            console.error('No audio URL available for download.');
        }
    };


    const updateSectionHistoryObj = (index, newKeyValuePair) => {
        const currentMap = localSectionHistoryArray[index];
        if (currentMap instanceof Map) {
            const updatedMap = new Map(currentMap);
            for (const [key, value] of Object.entries(newKeyValuePair)) {
                updatedMap.set(key, value.clone ? value.clone() : value);
            }

            const updatedSectionHistoryArray = [...localSectionHistoryArray];
            updatedSectionHistoryArray[index] = updatedMap;
            setLocalSectionHistoryArray(updatedSectionHistoryArray);
        }
    };

    async function generateVoiceWithCustomPreprocess(
        script,
        voiceId,
        voiceIntonationConsistency,
        modelId,
        userId,
        emotion,
        talkSpeed,
    ) {

        const voiceGender = sections[activeSectionIndex].content
            .voicePreviewFilename
            .split("/")[0];

        try {
            const response = await fetch(
                audioProcessingWebServiceUrl + "/preprocess-voiceover",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        script,
                        voice: voiceId,
                        voice_intonation_consistency: voiceIntonationConsistency,
                        model_id: modelId,
                        voice_gender: voiceGender,
                        user_id: userId,
                        emotion: emotion,
                        speech_rate: talkSpeed,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data["pyro_history_item_id"]) {
                throw new Error("pyro_history_item_id not found in response");
            }

            const pyroHistoryItemId = data["pyro_history_item_id"];
            const estimatedProcessingTime =
                (1 / CHARACTERSPERSEC) *
                sections[activeSectionIndex].content.currentCharCount *
                SECTOMILLISEC +
                ADDITIONALWAITTIME;

            const audioUrl = await fetchAudioFromPyroBackendDistribution(
                pyroHistoryItemId,
                estimatedProcessingTime
            );

            return { audioUrl, localHistoryItemId: pyroHistoryItemId };
        } catch (error) {
            console.error("Error in generating voice with custom preprocess:", error);
            throw error;
        }
    }

    const manageLegacySpeechRate = (legacyValue) => {
        const legacyMapping = {
            Normal: 0,
            "1.25x": 25,
            "1.5x": 50,
            "1.75x": 75,
            "2x": 100,
        };

        if (legacyMapping.hasOwnProperty(legacyValue)) {
            return legacyMapping[legacyValue];
        }

        const numericValue = Number(legacyValue);
        if (!isNaN(numericValue) && numericValue >= -50 && numericValue <= 100) {
            return numericValue;
        }

        // If the value is neither a legacy string nor a valid number, return 0 by default
        return 0;
    };

    const handleGenerate = async (index) => {
        setGeneratingIndex(index); // Set the index of the currently generating section
        try {
            let audioUrl = "";
            let localHistoryItemId;
            let currentContent = sections[index].content.currentContent;
            let currentTransformations = sections[index].content.currentTransformations;

            // Apply transformations from currentTransformations
            for (const key in currentTransformations) {
                const { originalWord, transformedWord } = currentTransformations[key];
                const regex = new RegExp(`\\b${originalWord}\\b`, 'gi'); // Using global and case-insensitive flags
                currentContent = currentContent.replace(regex, transformedWord);
            }

            // Replace words with custom pronunciations
            customPronunciations.forEach(({ word, pronunciation, case_sensitivity }) => {
                const regexFlags = case_sensitivity ? 'g' : 'gi';
                const regex = new RegExp(`\\b${word}\\b`, regexFlags);
                currentContent = currentContent.replace(regex, pronunciation);
            });

            const preprocessRequired = sections[index].content.emotion !== "Neutral" || manageLegacySpeechRate(sections[index].content.speechRate) > 0;
            const result = preprocessRequired
                ? await generateVoiceWithCustomPreprocess(
                    currentContent,
                    sections[index].content.voiceId,
                    sections[index].content.intonationConsistencyLevel,
                    sections[index].content.modelId,
                    auth.currentUser.uid,
                    sections[index].content.emotion,
                    manageLegacySpeechRate(sections[index].content.speechRate),
                )
                : await generateVoiceWithElevenLabsAPI(
                    currentContent,
                    sections[index].content.modelId,
                    sections[index].content.voiceId,
                    sections[index].content.intonationConsistencyLevel
                );

            audioUrl = result.audioUrl;
            localHistoryItemId = result.localHistoryItemId;
            setCurrentAudioUrl(audioUrl);

            const updatedSections = [...sections];
            updatedSections[index].content.generatedVoiceUrl = audioUrl;
            updatedSections[index].content.historyItemId = localHistoryItemId;
            setSections(updatedSections);
            setAudioPlayerForceRenderKey(Math.random());
            setAudioPlayerAutoPlay(true);

            const clonedSection = updatedSections[index].clone();
            updateSectionHistoryObj(index, {
                [localHistoryItemId]: clonedSection,
            });
        } catch (error) {
            console.error("Error generating voice:", error);
        } finally {
            setGeneratingIndex(null); // Reset after generation is complete
        }
    };




    useEffect(() => {
        sections.forEach((section, index) => {
            if (
                section.type === 'uploaded' &&
                section.content.audioFile &&
                !waveformRefs.current[index]
            ) {
                const container = document.getElementById(`waveform-${index}`);
                if (container) {
                    waveformRefs.current[index] = WaveSurfer.create({
                        container: `#waveform-${index}`,
                        waveColor: '#ddd',
                        progressColor: '#eb631c',
                        cursorColor: '#eb631c',
                        height: 80,
                        barWidth: 2,
                    });

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        waveformRefs.current[index].loadBlob(
                            new Blob([e.target.result], {
                                type: section.content.audioFile.type,
                            })
                        );
                    };
                    reader.readAsArrayBuffer(section.content.audioFile);

                    waveformRefs.current[index].on('click', () => {
                        waveformRefs.current[index].playPause();
                    });
                }
            }
        });
    }, [sections]);

    const triggerFileInput = (index) => {
        inputRefs.current[index]?.click();
    };

    const handleVoiceChange = (index) => {
        console.log(`Section index: ${index}`);
    };



    return (
        <div className={styles.pageWrapper}>
            <FireNavbar sectionsArray={sections} />
            <div className={styles.contentWrapper}>
                <Menu activeTab={activeTab} handleTabChange={handleTabChange} />
                {isVoiceOverOpen && <VoiceOverPanel />}
                {isMusicOpen && <MusicPanel />}
                {isPronunciationOpen && <PronunciationPanel />}
                {isSectionHistoryOpen && (
                    <SectionHistory
                        sectionIndex={activeSectionIndex}
                        setIsSectionHistoryOpen={setIsSectionHistoryOpen}
                        sectionHistoryArray={localSectionHistoryArray}
                        setSectionHistoryArray={setLocalSectionHistoryArray}

                    />
                )}
                {isNotesOpen && <NotesPanel />}
                <div className={styles.sectionsColumn} ref={notesSectionRef}>
                    <div className={styles.musicLabel}> Chosen Music : {chosenMusic} </div>
                    {/* Add Section at the very top */}
                    <div className={styles.addSectionTop}>
                        <div className={styles.controlRow}>
                            {/* <span className={styles.durationLabel}>
                                {initialPauseDurationSeconds.toFixed(1)} s
                            </span>
                            <span
                                className={styles.miniPlus}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setInitialPauseDurationSeconds((prev) => prev + 0.1);
                                }}
                            >
                                <i className={`bi bi-plus-lg ${styles.smallPlusIcon}`}></i>
                            </span> */}

                            <span className={styles.topLeftLine}></span>

                            <div onClick={(e) => e.stopPropagation()}>
                                <Dropdown drop="down" className={styles.addSectionDropdown}>
                                    <Dropdown.Toggle variant="link" className={styles.addSectionIcon} >
                                        <i class="bi bi-plus-lg"></i>
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                        <Dropdown.Item
                                            onClick={() => addSection(-1, 'text')}
                                            className={styles.addSectionDropdownItem}
                                        >
                                            <i className="bi bi-file-earmark-text"></i> Add a section
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            onClick={() => addSection(-1, 'audio')}
                                            className={styles.addSectionDropdownItem}
                                        >
                                            <i className="bi bi-mic"></i> Upload audio
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>

                            <span className={styles.mainLine}></span>
                        </div>
                    </div>

                    {/* Existing sections */}
                    {sections.map((section, index) => (
                        <div
                            key={index}
                            ref={sectionRefs.current[index]}
                            onClick={() => setActiveSectionIndex(index)}
                            className={styles.sectionWrapper}
                        >
                            <Card className={`${styles.card} ${styles.sectionCard} ${index === activeSectionIndex ? styles.activeSection : ''}`}>
                                <Card.Body className={styles.cardBody}>
                                    <div className={styles.cardHeader}>
                                        <div
                                            className={styles.userAvatar}
                                            style={{
                                                backgroundColor: '#eb631c',
                                                color: 'white',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                fontSize: '22px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVoiceChange(index);
                                            }}
                                        >
                                            {section.content.voiceName
                                                ? section.content.voiceName[0].toUpperCase()
                                                : '?'}
                                        </div>
                                        {section.type === 'generated' ? (
                                            <TextareaAutosize
                                                // Use TextareaAutosize instead of Form.Control
                                                value={section.content.currentContent}
                                                onChange={(e) => updateContent(index, e.target.value)}
                                                placeholder="Enter section content..."
                                                className={styles.sectionTextarea}
                                                minRows={1} // Sets the minimum number of rows
                                            // Remove onInput since it's handled by TextareaAutosize
                                            // Optionally, you can add a maxRows if you want to limit the height
                                            // maxRows={10}
                                            />
                                        ) : section.type === 'uploaded' ? (
                                            section.content.audioFile ? (
                                                <div>
                                                    <div id={`waveform-${index}`} className={styles.waveform}></div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <Button
                                                        className={`${styles.sectionTextarea} ${styles.uploadButton}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            triggerFileInput(index);
                                                        }}
                                                    >
                                                        Click here to upload audio
                                                    </Button>
                                                    <input
                                                        type="file"
                                                        accept="audio/mp3,audio/wav,audio/*"
                                                        ref={(el) => (inputRefs.current[index] = el)}
                                                        onChange={(event) => handleAudioUpload(index, event)}
                                                        style={{ display: 'none' }}
                                                    />
                                                </div>
                                            )
                                        ) : null}
                                    </div>

                                    <div className={styles.sectionActions}>
                                        {section.type !== 'uploaded' && (
                                            <Button
                                                className={styles.generateButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerate(index);
                                                }}
                                                disabled={
                                                    !section.content.currentContent || // Disable if content is empty
                                                    generatingIndex === -1 ||
                                                    (generatingIndex !== null && generatingIndex !== index)
                                                }
                                            >
                                                {generatingIndex === index ? (
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                ) : (
                                                    "Generate"
                                                )}
                                            </Button>
                                        )}

                                        {section.type !== 'uploaded' && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Dropdown>
                                                    <Dropdown.Toggle variant="link" className={styles.moreOptionsButton}>
                                                        <i className="bi bi-three-dots"></i>
                                                    </Dropdown.Toggle>

                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            onClick={() => handleReplay(index)}
                                                            className={styles.moreOptionsDropdownItem}
                                                            disabled={!section.content.historyItemId}
                                                        >
                                                            <i className="bi bi-arrow-clockwise"></i> Replay
                                                        </Dropdown.Item>
                                                        <Dropdown.Item
                                                            onClick={() => handleSectionAudioDownload(index)}
                                                            className={styles.moreOptionsDropdownItem}
                                                            disabled={!section.content.historyItemId}
                                                        >
                                                            <i className="bi bi-download"></i> Download
                                                        </Dropdown.Item>
                                                        <Dropdown.Item
                                                            onClick={() => handleDuplicate(index)}
                                                            className={styles.moreOptionsDropdownItem}
                                                        >
                                                            <i className="bi bi-files"></i> Duplicate
                                                        </Dropdown.Item>
                                                        {section.type === 'generated' && (
                                                            <>
                                                                <Dropdown.Item
                                                                    onClick={() => handleHistory(index)}
                                                                    disabled={!localSectionHistoryArray[section.index] || localSectionHistoryArray[section.index].size === 0}
                                                                    className={styles.moreOptionsDropdownItem}
                                                                >
                                                                    <i className="bi bi-clock-history"></i> History
                                                                </Dropdown.Item>

                                                                <Dropdown.Item
                                                                    onClick={() => handleEmphasis(index)}
                                                                    className={styles.moreOptionsDropdownItem}
                                                                >
                                                                    <i className="bi bi-megaphone"></i> Emphasis
                                                                </Dropdown.Item>
                                                            </>
                                                        )}
                                                        <Dropdown.Item
                                                            onClick={() => handleDelete(index)}
                                                            className={styles.moreOptionsDropdownItem}
                                                        >
                                                            <i className="bi bi-trash"></i> Delete
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>
                                        )}
                                    </div>

                                </Card.Body>
                            </Card>

                            {/* Section for adding more content */}
                            <div className={styles.addSection}>
                                <div className={styles.controlRow}>
                                    <span className={styles.durationLabel}>
                                        {section.endOfSectionPauseDurationSeconds.toFixed(1)} s
                                    </span>
                                    <span
                                        className={styles.miniPlus}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateDuration(index, 0.1);
                                        }}
                                    >
                                        <i className={`bi bi-plus-lg ${styles.smallPlusIcon}`}></i>
                                    </span>

                                    <span className={styles.mainLine}></span>

                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Dropdown
                                            show={dropdownOpen === index}
                                            onToggle={(isOpen) => setDropdownOpen(isOpen ? index : null)}
                                            drop="down"
                                        >
                                            <Dropdown.Toggle variant="link" className={styles.addSectionIcon}>
                                                <i className="bi bi-plus-lg"></i>
                                            </Dropdown.Toggle>

                                            <Dropdown.Menu>
                                                <Dropdown.Item
                                                    onClick={() => addSection(index, 'text')}
                                                    className={styles.addSectionDropdownItem}
                                                >
                                                    <i className="bi bi-file-earmark-text"></i> Add a section
                                                </Dropdown.Item>
                                                <Dropdown.Item
                                                    onClick={() => addSection(index, 'audio')}
                                                    className={styles.addSectionDropdownItem}
                                                >
                                                    <i className="bi bi-mic"></i> Upload audio
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>

                                    <span className={styles.mainLine}></span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Dummy section at the bottom to prevent dropdown obstruction */}
                    <div className={styles.dummyBottomSection}></div>

                    {isScrollable && (
                        <div className={styles.scrollButtonsContainer}>
                            <div className={styles.scrollToTopButton} onClick={() => scrollTo(0)}>
                                <i className="bi bi-arrow-up"></i>
                            </div>
                            <div className={styles.scrollToBottomButton} onClick={() => scrollTo(notesSectionRef.current.scrollHeight)}>
                                <i className="bi bi-arrow-down"></i>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {isMounted && (
                <SimpleAudioPlayer
                    audioSrc={currentAudioUrl}
                    className={styles.audioPlayer}
                    forceRenderKey={audioPlayerForceRenderKey}
                    autoPlay={audioPlayerAutoPlay}
                />
            )}

            {/* Render WordSmithOffcanvas */}
            {offcanvasVisible && (
                <WordSmithOffcanvas
                    offcanvasVisible={offcanvasVisible}
                    hideOffcanvas={() => setOffcanvasVisible(false)}
                    sections={sections}
                    setSections={setSections}
                    selectedSectionIndex={activeSectionIndex}
                />
            )}
        </div>
    );
};

export default withAuth(BuildYourSpot);
// export default BuildYourSpot;

