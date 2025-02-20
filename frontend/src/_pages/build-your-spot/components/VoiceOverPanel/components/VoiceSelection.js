import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Dropdown, Button } from 'react-bootstrap';
import { getFirestore, collection, getDocs } from "firebase/firestore";
import useGlobalStore from "@/store/global-store";
import app from "@/firebase";
import 'bootstrap-icons/font/bootstrap-icons.css';
import styles from '../styles/VoiceSelection.module.css';
import GeneratedContent from '@/dataStructures/GeneratedContent';
import Section from '@/dataStructures/section';

const VoiceSelection = ({ onBack, onClose }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({});
    const [voices, setVoices] = useState([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState(null); // Add this state
    const audioRef = useRef(null);
    const db = getFirestore(app);

    const baseVoicePreviewsUrl = process.env.NEXT_PUBLIC_VOICE_PREVIEWS_URL;

    const {
        sectionsArray,
        setSectionsArray,
        activeSectionIndex,
        setCurrentAudioUrl,
        setAudioPlayerForceRenderKey,
        setAudioPlayerAutoPlay,
    } = useGlobalStore();

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    useEffect(() => {
        const fetchVoices = async () => {
            const querySnapshot = await getDocs(collection(db, 'pyro_voices'));
            const fetchedVoices = [];

            querySnapshot.forEach((doc) => {
                const voiceData = doc.data();
                // Exclude voices with '[Cloned]' postfix in the pyro_name temporarily
                if (!voiceData.pyro_name.endsWith("(Cloned)")) {
                    fetchedVoices.push({ id: doc.id, ...voiceData });
                }
            });

            // Sort voices alphabetically by pyro_name
            fetchedVoices.sort((a, b) => a.pyro_name.localeCompare(b.pyro_name));

            setVoices(fetchedVoices);
        };

        fetchVoices();
    }, []);



    useEffect(() => {
        const initialFilters = {};
        filtersConfig.forEach((filter) => {
            initialFilters[filter.name] = 'Any';
        });
        setFilters(initialFilters);
    }, []);

    const resetFilters = () => {
        const resetFilters = {};
        Object.keys(filters).forEach((key) => {
            resetFilters[key] = 'Any';
        });
        setFilters(resetFilters);
    };

    const characteristicsList = [...new Set(voices.flatMap((voice) => voice.characteristics))];
    const languagesList = [...new Set(voices.map((voice) => voice.language))];
    const agesList = [...new Set(voices.map((voice) => voice.age))];
    const gendersList = [...new Set(voices.map((voice) => voice.gender))];

    const filtersConfig = [
        { name: 'age', label: 'Age', options: agesList },
        { name: 'gender', label: 'Gender', options: gendersList },
        { name: 'characteristics', label: 'Characteristics', options: characteristicsList },
        { name: 'language', label: 'Language', options: languagesList },
    ];

    const filteredVoices = voices.filter((voice) => {
        const query = searchQuery.toLowerCase();

        const searchMatch = Object.values(voice).some(
            (value) => typeof value === 'string' && value.toLowerCase().includes(query)
        );

        const filtersMatch = filtersConfig.every((filter) => {
            const selectedValue = filters[filter.name];
            if (selectedValue === 'Any') return true;
            const itemValue = voice[filter.name];
            if (Array.isArray(itemValue)) {
                return itemValue.includes(selectedValue);
            }
            return itemValue === selectedValue;
        });

        return searchMatch && filtersMatch;
    });

    const handleVoiceSelect = (voice) => {
        const activeSection = sectionsArray[activeSectionIndex];
        if (!activeSection) {
            console.error('No active section found.');
            return;
        }

        if (activeSection.type !== 'generated') {
            console.error('Active section is not of type "generated".');
            return;
        }

        const updatedSections = sectionsArray.map((section, index) =>
            index === activeSectionIndex
                ? new Section({
                    ...section,
                    content: new GeneratedContent({
                        ...section.content,
                        modelId: voice.model_id,
                        voiceId: voice.elevenlabs_id,
                        voiceName: voice.pyro_name,
                        voicePreviewFilename: voice.voice_preview_filename,
                        intonationConsistencyLevel: voice.stability * 100 || 0,
                    }),
                })
                : section
        );

        setSectionsArray(updatedSections);
        setSelectedVoiceId(voice.elevenlabs_id); // Update selected voice ID
    };

    const handleVoicePreviewPlayButton = (e, voice) => {
        e.stopPropagation(); // Prevent triggering handleVoiceSelect
        const audioUrl = baseVoicePreviewsUrl + voice.voice_preview_filename;

        setCurrentAudioUrl(audioUrl);
        setAudioPlayerForceRenderKey(Math.random());
        setAudioPlayerAutoPlay(true);
    };


    return (
        <Card className={styles.scrollableCard} style={{ width: '300px', flexDirection: 'column', overflowY: 'auto' }}>
            <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div style={{ flex: '0 0 2rem' }}>
                        {onBack && (
                            <i className={`bi bi-chevron-left ${styles.backButton}`} onClick={onBack}></i>
                        )}
                    </div>
                    <h5 className="mb-0 text-center flex-grow-1">Select a voice</h5>
                    <div style={{ flex: '0 0 2rem' }}>
                        {onClose && (
                            <Button variant="light" onClick={onClose} className="closeButton">
                                <i className="bi bi-x-lg"></i>
                            </Button>
                        )}
                    </div>
                </div>
                <Form.Control
                    type="search"
                    placeholder="Search by name, gender, etc."
                    className={`mb-2 ${styles.smallPlaceholder}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span></span>
                    <Dropdown
                        show={showFilters}
                        onToggle={(isOpen) => setShowFilters(isOpen)}
                        style={{ marginTop: '5px' }}
                        drop="center"
                    >
                        <Dropdown.Toggle variant="light" className="bg-transparent border-0 p-0">
                            <i className="bi bi-funnel"></i> Filters
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="start" className="mt-1 p-2" style={{ width: '250px' }}>
                            <Form>
                                {filtersConfig.map((filter, index) => (
                                    <Form.Group className="mb-2" key={index}>
                                        <Form.Label>{filter.label}</Form.Label>
                                        <Form.Select
                                            value={filters[filter.name]}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    [filter.name]: e.target.value,
                                                })
                                            }
                                        >
                                            <option>Any</option>
                                            {filter.options.map((option, idx) => (
                                                <option key={idx}>{option}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                ))}
                            </Form>
                            <div className="mt-3 text-end">
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        resetFilters();
                                    }}
                                    className="text-decoration-none"
                                >
                                    Reset Filters
                                </a>
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                <hr className="mt-0 mb-2" />
                <div className={styles.itemList}>
                    {filteredVoices.map((voice) => (
                        <div
                            key={voice.id}
                            className={`${styles.voiceItem} ${selectedVoiceId === voice.id ? styles.selectedVoice : ''}`}
                            onClick={() => handleVoiceSelect(voice)}
                        >
                            <div className="d-flex flex-column">
                                <div>{voice.pyro_name}</div>
                                <small className="text-muted">{`${voice.gender} • ${voice.age} • ${voice.language}`}</small>
                                {voice.tags && voice.tags.length > 0 && (
                                    <div className="mt-1">
                                        {voice.tags.map((tag, tagIndex) => (
                                            <span key={tagIndex} className="badge bg-light text-dark me-1">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <i
                                    className={`bi bi-play-circle ${styles.playIcon}`}
                                    onClick={(e) => handleVoicePreviewPlayButton(e, voice)}
                                ></i>
                            </div>
                        </div>
                    ))}
                    <div style={{ height: '70px' }}></div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default VoiceSelection;
