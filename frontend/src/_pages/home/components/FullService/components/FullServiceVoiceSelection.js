import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Dropdown, Card } from 'react-bootstrap';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '@/firebase';
import styles from '../styles/FullServiceVoiceSelection.module.css';
import SimpleAudioPlayer from '@/_pages/build-your-spot/components/SimpleAudioPlayer';
import useGlobalStore from '@/store/global-store';
import OrderSummary from './order-summary';
import Swal from 'sweetalert2';

const FullServiceVoiceSelection = ({ onNext, onBack }) => {
    const [voices, setVoices] = useState([]);
    const [filteredVoices, setFilteredVoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeVoiceIndex, setActiveVoiceIndex] = useState(null);
    const [filters, setFilters] = useState({
        age: 'Any',
        gender: 'Any',
        characteristics: 'Any',
        language: 'Any',
    });
    const [filtersConfig, setFiltersConfig] = useState([]);
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const db = getFirestore(app);
    const {
        fullServiceScript,
        fullServiceAdLength,
        fullServiceNumVoices,
        selectedVoices,
        setSelectedVoices,
        additionalComments,
        setAdditionalComments,
        musicStyle,
        setMusicStyle,
        includeSFX,
        setIncludeSFX,
        currentAudioUrl,
        setCurrentAudioUrl,
        audioPlayerForceRenderKey,
        setAudioPlayerForceRenderKey,
        audioPlayerAutoPlay,
        setAudioPlayerAutoPlay


    } = useGlobalStore();
    const baseVoicePreviewsUrl = process.env.NEXT_PUBLIC_VOICE_PREVIEWS_URL;


    useEffect(() => {
        const fetchVoices = async () => {
            const querySnapshot = await getDocs(collection(db, 'pyro_voices'));
            const fetchedVoices = querySnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((voice) => !voice.pyro_name.endsWith("(Cloned)")); // Exclude cloned voices temporarily

            // Sort voices alphabetically by pyro_name
            fetchedVoices.sort((a, b) => a.pyro_name.localeCompare(b.pyro_name));

            setVoices(fetchedVoices);
            setFilteredVoices(fetchedVoices);

            const characteristicsList = [
                ...new Set(fetchedVoices.flatMap((voice) => voice.characteristics)),
            ];
            const languagesList = [...new Set(fetchedVoices.map((voice) => voice.language))];
            const agesList = [...new Set(fetchedVoices.map((voice) => voice.age))];
            const gendersList = [...new Set(fetchedVoices.map((voice) => voice.gender))];

            setFiltersConfig([
                { name: 'age', label: 'Age', options: ['Any', ...agesList] },
                { name: 'gender', label: 'Gender', options: ['Any', ...gendersList] },
                { name: 'characteristics', label: 'Characteristics', options: ['Any', ...characteristicsList] },
                { name: 'language', label: 'Language', options: ['Any', ...languagesList] },
            ]);
        };

        fetchVoices();
        setCurrentAudioUrl("");
        setAudioPlayerForceRenderKey(Math.random());
        setAudioPlayerAutoPlay(false);

    }, []);



    useEffect(() => {
        const results = voices.filter((voice) => {
            const matchesSearchTerm =
                voice.pyro_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                voice.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
                voice.age.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                voice.gender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (Array.isArray(voice.characteristics) &&
                    voice.characteristics.some((characteristic) =>
                        characteristic.toLowerCase().includes(searchTerm.toLowerCase())
                    ));

            const matchesFilters = Object.keys(filters).every((key) => {
                const filterValue = filters[key];
                if (filterValue === 'Any') return true;

                const voiceValue = voice[key];
                if (Array.isArray(voiceValue)) {
                    return voiceValue.some((value) => value.toLowerCase() === filterValue.toLowerCase());
                }

                if (typeof voiceValue === 'string') {
                    return voiceValue.toLowerCase() === filterValue.toLowerCase();
                }

                return voiceValue.toString().toLowerCase() === filterValue.toLowerCase();
            });

            return matchesSearchTerm && matchesFilters;
        });

        setFilteredVoices(results);
    }, [searchTerm, voices, filters]);

    const handleVoiceSelect = (voice) => {
        if (activeVoiceIndex === null) return;

        const updatedVoices = [...selectedVoices];
        updatedVoices[activeVoiceIndex] = { ...updatedVoices[activeVoiceIndex], name: voice.pyro_name };
        setSelectedVoices(updatedVoices);
    };

    const handleVoiceSlotClick = (index) => {
        setActiveVoiceIndex(index);
    };

    const addVoice = () => {
        if (selectedVoices.length < 10) {
            const newVoice = { id: selectedVoices.length + 1, name: '' };
            setSelectedVoices([...selectedVoices, newVoice]);
            setActiveVoiceIndex(selectedVoices.length);
        }
    };

    const removeVoice = (index) => {
        const updatedVoices = selectedVoices.filter((_, i) => i !== index);
        setSelectedVoices(updatedVoices);
        if (activeVoiceIndex === index) {
            setActiveVoiceIndex(null);
        }
    };

    const handleReview = () => {
        if (selectedVoices.length === 0 || selectedVoices.every(voice => !voice.name)) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Please select at least one voice before proceeding.',
            });
            return;
        }

        setShowOrderSummary(true);
        if (onNext) {
            onNext();
        }
    };

    const handleVoicePreviewPlayButton = (e, voice) => {
        e.stopPropagation(); // Prevent triggering handleVoiceSelect
        const audioUrl = baseVoicePreviewsUrl + voice.voice_preview_filename;

        setCurrentAudioUrl(audioUrl);
        setAudioPlayerForceRenderKey(Math.random());
        setAudioPlayerAutoPlay(true);
    };

    const resetFilters = () => {
        setFilters({
            age: 'Any',
            gender: 'Any',
            characteristics: 'Any',
            language: 'Any',
        });
    };

    return (
        <>
            {!showOrderSummary ? (
                <div className={styles.container}>
                    <div className={styles.leftPanel}>
                        {activeVoiceIndex !== null && (
                            <h3 style={{ color: 'black', fontSize: '25px' }}>Selecting for voice #{activeVoiceIndex + 1}</h3>
                        )}
                        <InputGroup className="mb-3" style={{ marginLeft: '0px', }}>
                            <InputGroup.Text>
                                <i className="bi bi-search"></i>
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search by name, age etc."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ marginRight: '20px' }}
                            />
                        </InputGroup>
                        <Dropdown style={{ marginTop: '5px' }} drop="down">
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
                                                {filter.options.map((option, idx) => (
                                                    <option key={idx}>{option}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    ))}
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
                                </Form>
                            </Dropdown.Menu>
                        </Dropdown>
                        <div className={styles.voiceList}>
                            {filteredVoices.map((voice) => (
                                <div
                                    key={voice.id}
                                    className={`${styles.voiceItem} ${activeVoiceIndex !== null &&
                                        selectedVoices[activeVoiceIndex] &&
                                        selectedVoices[activeVoiceIndex].name === voice.pyro_name
                                        ? styles.active
                                        : ''
                                        }`}
                                    onClick={() => handleVoiceSelect(voice)}
                                >
                                    <div className="d-flex flex-column">
                                        <div style={{ color: 'black' }}>{voice.pyro_name}</div>
                                        <small className="text-muted">
                                            {`${voice.gender} • ${voice.age} • ${voice.language}`}
                                        </small>
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
                                        <i className={`bi bi-play-circle ${styles.playIcon}`}
                                            onClick={(e) => handleVoicePreviewPlayButton(e, voice)}

                                        ></i>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.rightPanel}>
                        <div className={styles.rightPanelContent}>
                            <div className={styles.mainContent}>
                                <h2 className={styles.heading}>Now select the voices and music</h2>
                                <div className={styles.selectedVoicesContainer}>
                                    <div className={styles.selectedVoices}>
                                        {selectedVoices.map((voice, index) => (
                                            <div
                                                key={voice.id}
                                                className={`${styles.selectedVoiceCard} ${activeVoiceIndex === index ? styles.activeVoiceCard : ''
                                                    }`}
                                                onClick={() => handleVoiceSlotClick(index)}
                                            >
                                                <div className={styles.cardHeader}>
                                                    <span>{voice.name || `Select voice #${index + 1}`}</span>
                                                    {index > 0 && (
                                                        <i
                                                            className={`bi bi-x-circle ${styles.deleteIcon}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeVoice(index);
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {selectedVoices.length < 10 && (
                                    <Button
                                        onClick={addVoice}
                                        className={styles.addVoiceButton}
                                        style={{
                                            backgroundColor: '#EB631C',
                                            borderColor: '#EB631C',
                                            color: 'white',
                                            marginBottom: '20px',
                                            marginTop: '20px',
                                        }}
                                    >
                                        <i className="bi bi-plus-circle"></i> Add Voice
                                    </Button>
                                )}
                                <div style={{ marginTop: '20px' }}>
                                    <Form>
                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                Describe the style of music you want (e.g., acoustic pop). You can give specific
                                                artists and songs as inspiration.
                                            </Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={musicStyle}
                                                onChange={(e) => setMusicStyle(e.target.value)}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                label="Should we include SFX to your ad according to your script?"
                                                checked={includeSFX}
                                                onChange={(e) => setIncludeSFX(e.target.checked)}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Would you like to add any additional comments?</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={additionalComments}
                                                onChange={(e) => setAdditionalComments(e.target.value)}
                                            />
                                        </Form.Group>
                                        <div className={styles.footer}>
                                            <div className={styles.buttonContainer}>
                                                <Button
                                                    onClick={onBack}  // Assuming `onBack` is the function to handle the "Go Back" action
                                                    className={styles.goBackButton}
                                                    style={{
                                                        backgroundColor: '#D3D3D3',
                                                        borderColor: '#D3D3D3',
                                                        color: 'black',
                                                        marginRight: '10px',
                                                    }}
                                                >
                                                    Go Back
                                                </Button>
                                                <Button
                                                    onClick={handleReview}  // The existing "Review" button functionality
                                                    className={styles.reviewButton}
                                                    style={{
                                                        backgroundColor: '#EB631C',
                                                        borderColor: '#EB631C',
                                                        color: 'white',
                                                    }}
                                                >
                                                    Review
                                                </Button>
                                            </div>
                                        </div>

                                    </Form>
                                </div>
                                <SimpleAudioPlayer
                                    audioSrc={currentAudioUrl}
                                    className={styles.audioPlayer}
                                    forceRenderKey={audioPlayerForceRenderKey}
                                    autoPlay={audioPlayerAutoPlay}
                                />
                            </div>
                            <Card className={styles.bootstrapCard}>
                                {/* Placeholder for width scale issue */}
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <OrderSummary
                    script={fullServiceScript}
                    adLength={fullServiceAdLength}
                    numVoices={fullServiceNumVoices}
                />
            )}
        </>
    );
};

export default FullServiceVoiceSelection;
