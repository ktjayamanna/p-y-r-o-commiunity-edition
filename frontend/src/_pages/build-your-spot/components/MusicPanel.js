import React, { useState, useEffect, useMemo } from 'react';
import { Card, Form, Dropdown, Button } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import useGlobalStore from "@/store/global-store";
import app from '@/firebase';
import styles from '../styles/MusicPanel.module.css';

const MusicSelection = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [musicTracks, setMusicTracks] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({});
    const db = getFirestore(app);

    const {
        setActiveTab,
        sectionsArray,
        setSectionsArray,
        activeSectionIndex,
        chosenMusic,
        setChosenMusic,
        previewFileName,
        setPreviewFileName,
        backgroundMusicFilename,
        setBackgroundMusicFilename,
        musicVol,
        setMusicVol,
        setCurrentAudioUrl,
        setAudioPlayerForceRenderKey,
        setAudioPlayerAutoPlay
    } = useGlobalStore();

    const currentSection = sectionsArray[activeSectionIndex];
    const baseMusicPreviewsUrl = process.env.NEXT_PUBLIC_VOICE_PREVIEWS_URL;


    const handleClose = () => {
        setIsOpen(false);
        setActiveTab('');
    };

    useEffect(() => {
        const fetchMusicTracks = async () => {
            const querySnapshot = await getDocs(collection(db, 'background_music'));
            const fetchedTracks = [];

            // Fetching all tracks from the database
            querySnapshot.forEach((doc) => {
                fetchedTracks.push({ id: doc.id, ...doc.data() });
            });

            // Add a "No Music" option as the first track
            const noMusicOption = {
                id: 'no-music',
                pyro_name: 'No Music',
                background_music_filename: '',
                preview_filename: '',
                genre: '',
                tempo: '',
                tags: []
            };

            // Sort the fetched tracks alphabetically by pyro_name (or name if unavailable)
            fetchedTracks.sort((a, b) => {
                const nameA = a.pyro_name || a.name;
                const nameB = b.pyro_name || b.name;
                return nameA.localeCompare(nameB);
            });

            // Prepend the "No Music" option
            setMusicTracks([noMusicOption, ...fetchedTracks]);
        };

        fetchMusicTracks();
    }, []);


    // Memoize the genre, tempo, and tags lists
    const genresList = useMemo(
        () => [...new Set(musicTracks.map((track) => track.genre))],
        [musicTracks]
    );
    const temposList = useMemo(
        () => [...new Set(musicTracks.map((track) => track.tempo))],
        [musicTracks]
    );
    const tagsList = useMemo(
        () => [...new Set(musicTracks.flatMap((track) => track.tags || []))],
        [musicTracks]
    );

    // Memoize filtersConfig
    const filtersConfig = useMemo(
        () => [
            { name: 'genre', label: 'Genre', options: genresList },
            { name: 'tempo', label: 'Tempo', options: temposList },
            { name: 'tags', label: 'Tags', options: tagsList },
        ],
        [genresList, temposList, tagsList]
    );

    useEffect(() => {
        // Initialize filters only once when the component mounts
        const initialFilters = {};
        filtersConfig.forEach((filter) => {
            initialFilters[filter.name] = 'Any';
        });
        setFilters(initialFilters);
    }, []); // Empty dependency array ensures this runs only once

    const resetFilters = () => {
        const resetFilters = {};
        Object.keys(filters).forEach((key) => {
            resetFilters[key] = 'Any';
        });
        setFilters(resetFilters);
    };

    const handleMusicSelect = (track) => {
        setChosenMusic(track.name || track.pyro_name);
        setPreviewFileName(track.preview_filename);
        setBackgroundMusicFilename(track.background_music_filename);
        setMusicVol(track.musicVol || 50);
    };

    const handleMusicPreviewPlayButton = (e, track) => {
        e.stopPropagation(); // Prevent triggering handleVoiceSelect
        const audioUrl = baseMusicPreviewsUrl + track.preview_filename;

        setCurrentAudioUrl(audioUrl);
        setAudioPlayerForceRenderKey(Math.random());
        setAudioPlayerAutoPlay(true);
    };

    const renderMusicItem = (track) => {
        const isSelected = chosenMusic === (track.name || track.pyro_name);
        const isNoMusic = track.id === 'no-music';
        return (
            <div
                className={`${styles.voiceItem} ${isSelected ? styles.selectedItem : ''}`}
                key={track.id}
                onClick={() => handleMusicSelect(track)}
            >
                <div className="d-flex flex-column">
                    <div>{track.pyro_name || track.name}</div>
                    {!isNoMusic && (
                        <small className="text-muted">{`${track.genre} • ${track.tempo}`}</small>
                    )}
                    {track.tags && track.tags.length > 0 && (
                        <div className="mt-1">
                            {track.tags.map((tag, tagIndex) => (
                                <span key={tagIndex} className="badge bg-light text-dark me-1">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {!isNoMusic && (
                    <div>
                        <i className={`bi bi-play-circle ${styles.playIcon}`}
                            onClick={(e) => handleMusicPreviewPlayButton(e, track)}

                        ></i>

                    </div>
                )}
            </div>
        );
    };

    const filteredItems = musicTracks.filter((item) => {
        const query = searchQuery.toLowerCase();
        const searchMatch = Object.values(item).some(
            (value) => typeof value === 'string' && value.toLowerCase().includes(query)
        );
        const filtersMatch = filtersConfig.every((filter) => {
            const selectedValue = filters[filter.name];
            if (selectedValue === 'Any') return true;
            const itemValue = item[filter.name];
            if (Array.isArray(itemValue)) {
                return itemValue.includes(selectedValue);
            }
            return itemValue === selectedValue;
        });
        return searchMatch && filtersMatch;
    });

    if (!isOpen) {
        return null;
    }

    return (
        <Card className={styles.scrollableCard} style={{ width: '300px', flexDirection: 'column', overflowY: 'auto' }}>
            <Card.Body className="p-3">
                <div className="d-flex align-items-center mb-3">
                    <Card.Title className="mb-0 fw-bold" style={{ fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif" }}>Select Music</Card.Title>
                    <Button
                        variant="light"
                        onClick={handleClose}
                        className={`${styles.closeButton} ms-auto`}
                    >
                        <i className="bi bi-x-lg"></i>
                    </Button>
                </div>


                <Form.Control
                    type="search"
                    placeholder="Search by name, genre, etc."
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
                                <a href="#" onClick={(e) => { e.preventDefault(); resetFilters(); }} className="text-decoration-none">
                                    Reset Filters
                                </a>
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                <hr className="mt-0 mb-2" />
                <div className={styles.itemList}>
                    {filteredItems.map((item) => (
                        <div key={item.id} className={styles.item}>
                            {renderMusicItem(item)}
                        </div>
                    ))}
                    <div style={{ height: '70px' }}></div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default MusicSelection;
