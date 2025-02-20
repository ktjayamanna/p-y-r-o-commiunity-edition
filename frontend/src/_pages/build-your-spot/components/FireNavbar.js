import React, { useState, useEffect } from 'react';
import {
    Button, Form, Navbar, Nav, OverlayTrigger,
    Tooltip, Offcanvas, ListGroup, Modal, Spinner // Add Spinner import
} from 'react-bootstrap';
import styles from '../styles/FireNavbar.module.css';
import useGlobalStore from '@/store/global-store';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    where,
    limit,
    getDocs,
    startAfter,
    startAt,
    Timestamp,
    doc,
    updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useRouter } from 'next/router';
import {
    deserializeAndLoadModeData,
} from "@/utils/db-read-write-ops/deserialization-utils";
import {
    updateStates
} from "@/_pages/home/utils/update-state";
import { fetchAudioFromPyroBackendDistribution } from "@/utils/fetch-audio/fetch-from-distribution";
import app from "@/firebase";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import { createNewSpotInDb, updateExistingSpotInDb, writeToFirestore, } from "@/utils/db-read-write-ops/serialization-utils";
import axios from "axios";
import Swal from 'sweetalert2';
import Section from '@/dataStructures/section';
import GeneratedContent from '@/dataStructures/GeneratedContent';


const FireNavbar = ({ sectionsArray }) => {
    // Initialize Firestore and Auth
    const db = getFirestore(app);
    const auth = getAuth(app);
    const router = useRouter();

    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [recentAds, setRecentAds] = useState([]);
    const [cursors, setCursors] = useState([]); // Stack of cursors
    const [isSeeAll, setIsSeeAll] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateAdModal, setShowCreateAdModal] = useState(false);
    const [loading, setLoading] = useState(false); // Add loading state
    const [latestProducedAudioUrl, setLatestProducedAudioUrl] = useState(null);
    const [isSaveIconFilled, setIsSaveIconFilled] = useState(false)

    const { spotName,
        setSpotName,
        spotId,
        setSpotId,
        reset,
        stitchedAudioPyroHistoryItemId,
        setStitchedAudioPyroHistoryItemId,
        setCurrentAudioUrl,
        setAudioPlayerForceRenderKey,
        setAudioPlayerAutoPlay,
        setGeneratingIndex,
        backgroundMusicFilename,
        setSectionsArray
    } = useGlobalStore();

    const [tmpSpotName, setTmpSpotName] = useState("Untitled Spot");
    const pageSize = isSeeAll ? 10 : 5;
    const audioProcessingWebServiceUrl =
        process.env.NODE_ENV === "development"
            ? "http://localhost:8000"
            : process.env.NEXT_PUBLIC_AUDIO_SERVICES;

    function getGlobalStoreStates() {
        // Get the entire global store state, including actions
        const globalStore = useGlobalStore.getState();

        // Dynamically filter out actions (functions) and keep only state values
        const globalState = Object.fromEntries(
            Object.entries(globalStore).filter(([key, value]) => typeof value !== 'function')
        );
        return globalState;
    }

    const checkSpotNameExists = async (spotName) => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.error("User is not authenticated");
            return false; // Or handle accordingly
        }

        const spotsQuery = query(
            collection(db, "spots_meta_data"),
            where("spotName", "==", spotName),
            where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(spotsQuery);
        return !querySnapshot.empty;
    };

    const saveStates = async (newSpotName) => {
        if (newSpotName) {
            reset();

            // Create a default GeneratedContent
            const defaultContent = new GeneratedContent();
            const defaultSection = new Section({
                index: 0,
                type: 'generated',
                content: defaultContent,
            });
            setSectionsArray([defaultSection]);

            const { spotName, notes, ...modeSpecificStates } = getGlobalStoreStates();

            const tmpSpotId = await createNewSpotInDb({
                spotName: newSpotName,
                mode: "isildur",
                modeSpecificStates,
                sharedStates: { spotName: newSpotName, notes: notes },
            });

            setSpotId(tmpSpotId);
        } else {
            const { spotName, notes, ...modeSpecificStates } = getGlobalStoreStates();

            if (!spotId) throw new Error("spotId must be available to update an existing spot.");
            await updateExistingSpotInDb({
                spotId,
                modeSpecificStates,
                sharedStates: { spotName, notes },
            });
        }
    };


    async function updateLastEdited(db, spotId) {
        const spotDocRef = doc(db, "spots_meta_data", spotId);

        try {
            await updateDoc(spotDocRef, {
                lastEdited: Timestamp.now()
            });
        } catch (error) {
            console.error("Error updating last edited timestamp:", error);
        }
    }

    const handleSave = async () => {
        setIsSaveIconFilled(true); // Set icon to filled version immediately

        try {
            await updateLastEdited(db, spotId);
            await saveStates(); // Wait for the save to complete
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Failed to save. Please try again.");
        } finally {
            // Revert the icon back after a brief delay
            setTimeout(() => {
                setIsSaveIconFilled(false);
            }, 300); // Show the filled icon for 300 milliseconds
        }
    };


    const handleCreateAdClick = () => {
        handleSave();
        setShowCreateAdModal(true);
    };

    const handleNextOnCreateAd = async () => {
        if (!tmpSpotName.trim()) {
            toast.error("Please enter a name for the Spot.");
            return;
        }

        const exists = await checkSpotNameExists(tmpSpotName);
        if (exists) {
            toast.error("This spot name already exists. Please choose a different name.");
            return;
        }

        try {
            setLoading(true);  // Set loading to true
            // Wait for saveStates to fully complete before proceeding
            await saveStates(tmpSpotName);

            // Proceed only after the state is saved successfully
            setSpotName(tmpSpotName);
            setShowCreateAdModal(false);
            setShowOffcanvas(false);
            setTmpSpotName("Untitled Spot");

            router.push("/build-your-spot");
        } catch (error) {
            // Handle errors in saveStates properly
            toast.error("Failed to save spot. Please try again.");
            console.error("Error while saving states:", error);
        } finally {
            setLoading(false);  // Set loading to false
        }
    };

    // Firebase function to fetch ads where userId matches the authenticated user
    const fetchRecentAds = async (direction = 'next') => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.error("User is not authenticated");
            return;
        }

        try {
            const spotsCollectionRef = collection(db, "spots_meta_data");
            let spotsQuery;
            const baseQuery = query(
                spotsCollectionRef,
                where("userId", "==", currentUser.uid),
                where("mode", "in", ["advanced-script-to-ad", "isildur"]), // Added mode filter
                orderBy("lastEdited", "desc")
            );

            if (isSeeAll) {
                if (direction === 'next') {
                    if (cursors.length > 0) {
                        const lastCursor = cursors[cursors.length - 1];
                        spotsQuery = query(baseQuery, startAfter(lastCursor), limit(pageSize));
                    } else {
                        spotsQuery = query(baseQuery, limit(pageSize));
                    }
                } else if (direction === 'prev') {
                    // Remove the last cursor since we're going back
                    cursors.pop();
                    setCursors([...cursors]);

                    if (cursors.length > 0) {
                        const lastCursor = cursors[cursors.length - 1];
                        spotsQuery = query(baseQuery, startAt(lastCursor), limit(pageSize));
                    } else {
                        spotsQuery = query(baseQuery, limit(pageSize));
                    }
                } else {
                    // Initial fetch
                    spotsQuery = query(baseQuery, limit(pageSize));
                }
            } else {
                spotsQuery = query(baseQuery, limit(pageSize));
            }

            const querySnapshot = await getDocs(spotsQuery);

            const newAds = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            if (querySnapshot.docs.length > 0) {
                const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                if (direction === 'next') {
                    // Push new cursor when going to the next page
                    setCursors(prev => [...prev, lastVisibleDoc]);
                }
                setRecentAds(newAds);
            } else {
                setRecentAds([]);
            }

            if (isSeeAll) {
                if (direction === 'next') {
                    setCurrentPage(prev => prev + 1);
                } else if (direction === 'prev') {
                    setCurrentPage(prev => prev - 1);
                } else {
                    setCurrentPage(1); // when initial fetch
                }
            } else {
                setCurrentPage(1);
            }
        } catch (error) {
            console.error("Error fetching recent ads:", error);
        }
    };


    useEffect(() => {
        if (showOffcanvas) {
            fetchRecentAds('initial');
        }
    }, [isSeeAll, showOffcanvas]);

    const handleShowOffcanvas = () => {
        setShowOffcanvas(true);
        setIsSeeAll(false); // Reset to default view when opening sidebar
        setCurrentPage(1);
        setCursors([]);
    };

    const handleCloseOffcanvas = () => setShowOffcanvas(false);

    const handleProjectNameClick = () => setIsEditingName(true);
    const handleProjectNameChange = (e) => setSpotName(e.target.value);
    const handleProjectNameBlur = () => setIsEditingName(false);
    const handleProjectNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            setIsEditingName(false);
        }
    };

    const handleSeeAllClick = () => {
        setIsSeeAll(prev => !prev);
        setCurrentPage(1);
        setCursors([]);
    };

    const handleNextPage = () => fetchRecentAds('next');
    const handlePrevPage = () => fetchRecentAds('prev');

    async function handleEdit(spotId) {
        //save previous stuff 
        handleSave();
        updateLastEdited(db, spotId);

        reset();
        setShowOffcanvas(false);
        const data = await deserializeAndLoadModeData({ spotId });
        setSpotName(data.sharedStates.spotName);
        await updateStates(data);
        router.push("/build-your-spot");
    }

    const handleGoHome = async () => {
        saveStates();
        updateLastEdited(db, spotId);
        router.push("/home");
    };

    const handleProduce = async (e) => {
        e.preventDefault();

        // Validate that all sections have a valid content.historyItemId
        const hasInvalidHistoryItemId = sectionsArray.some(
            (section) => !section.content.historyItemId || typeof section.content.historyItemId !== "string" || section.content.historyItemId.trim() === ""
        );

        if (hasInvalidHistoryItemId) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Audio',
                text: 'Please generate the audio for all sections before producing the spot.',
                confirmButtonColor: '#eb631c', // Optional: Set the button color to match your branding
            });
            return; // Stop further execution if validation fails
        }

        setLoading(true); // Start loading spinner
        setGeneratingIndex(-1); // -1 represents producing all sections
        const userId = auth.currentUser ? auth.currentUser.uid : "anonymous";
        const historyItemIds = sectionsArray.map((section) =>
            section.content.historyItemId
        );
        const endOfSectionsPausesArray = sectionsArray.map((section) =>
            section.endOfSectionPauseDurationSeconds
        );
        const payload = {
            user_id: userId,
            history_item_id_list: historyItemIds,
            end_of_section_pause_duration_list: endOfSectionsPausesArray,
            music_filename: backgroundMusicFilename,
            musicVol: 0.1, // Adjust volume as needed
        };
        const url = `${audioProcessingWebServiceUrl}/produce-spot`;

        try {
            const response = await axios.post(url, payload);
            if (response.data.pyro_history_item_id) {
                const pyroHistoryItemId = response.data.pyro_history_item_id;
                if (!pyroHistoryItemId) {
                    throw new Error("Failed to preprocess voiceover");
                }

                const audioUrl = await fetchAudioFromPyroBackendDistribution(
                    pyroHistoryItemId,
                    0
                );
                setCurrentAudioUrl(audioUrl);
                setAudioPlayerAutoPlay(true);
                setAudioPlayerForceRenderKey(Math.random());
                setStitchedAudioPyroHistoryItemId(pyroHistoryItemId);
                setGeneratingIndex(null);
                setLatestProducedAudioUrl(audioUrl);
            } else if (response.data.error) {
                console.error(
                    "API returned an error:",
                    response.data.error,
                    response.data.details ? response.data.details : ""
                );
            }
        } catch (error) {
            console.error("Error fetching pyro_history_item_id:", error);
        } finally {
            setLoading(false); // End loading spinner
        }

        await writeToFirestore(
            "spots_meta_data",
            { historyItemId: stitchedAudioPyroHistoryItemId },
            spotId
        )
            .then(() => console.log("History item ID saved successfully."))
            .catch((error) => console.error("Error saving document:", error));
    };



    const handleDownloadProducedSpot = () => {
        if (latestProducedAudioUrl) {
            const link = document.createElement('a');
            link.href = latestProducedAudioUrl;
            link.download = `${spotName || 'produced_spot'}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            toast.error("No audio available to download. Please produce the spot first.");
        }
    };


    return (
        <>
            <Navbar className={styles.navBar}>
                <Button onClick={handleShowOffcanvas} className={styles.navBarMenuButton}>
                    <i className="bi bi-list"></i>
                </Button>

                {isEditingName ? (
                    <Form.Control
                        type="text"
                        value={spotName}
                        onChange={handleProjectNameChange}
                        onBlur={handleProjectNameBlur}
                        onKeyDown={handleProjectNameKeyDown}
                        autoFocus
                        className={styles.editableProjectName}
                    />
                ) : (
                    <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip id="tooltip-rename">Rename</Tooltip>}
                    >
                        <Navbar.Brand
                            className={`${styles.spotName} ${styles.hoverable}`}
                            onClick={handleProjectNameClick}
                        >
                            {spotName}
                        </Navbar.Brand>
                    </OverlayTrigger>
                )}

                <Nav className="ms-auto">

                    <Button variant="light" className={styles.navButton} onClick={handleSave}>
                        <i className={isSaveIconFilled ? "bi bi-save-fill" : "bi bi-save"}></i>
                        {isSaveIconFilled ? " Saved!" : " Save"}
                    </Button>

                    <Button
                        variant="light"
                        className={styles.navButton}
                        onClick={handleDownloadProducedSpot}
                        disabled={!latestProducedAudioUrl} // Disable if URL is empty or null
                    >
                        <i className="bi bi-download"></i> Download
                    </Button>
                    <Button
                        className={styles.produceSpotButton}
                        onClick={handleProduce}
                        disabled={sectionsArray.length === 0 || loading} // Disable when loading
                    >
                        {loading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Producing...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-magic"></i> Produce Spot
                            </>
                        )}
                    </Button>

                </Nav>
            </Navbar>


            <ToastContainer />

            <Offcanvas show={showOffcanvas} onHide={handleCloseOffcanvas} placement="start">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>
                        <img src="/White mic horizontal.png" alt="Firebay Studios Logo" className={styles.logoImg} />
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="d-flex flex-column">
                    <Button
                        className={styles.createAdButton}
                        onClick={handleCreateAdClick}
                    >
                        <i className="bi bi-plus-lg me-2"></i>
                        <span>Create an ad</span>
                    </Button>

                    <Nav.Link
                        onClick={handleGoHome}
                        className={styles.homeLink}
                        style={{ cursor: 'pointer' }} // Ensure it looks clickable
                    >
                        <i className="bi bi-house-door me-2"></i>
                        <span>Home</span>
                    </Nav.Link>


                    <div className={styles.recentAdsHeader}>
                        <h6 className={styles.recentAdsTitle}>Recent ads</h6>
                        <Button variant="link" className={styles.seeAllButton} onClick={handleSeeAllClick}>
                            {isSeeAll ? 'Collapse' : 'See all'}
                        </Button>
                    </div>

                    <ListGroup variant="flush">
                        {recentAds.length > 0 ? (
                            recentAds.map((item, index) => (
                                <ListGroup.Item
                                    key={item.id}
                                    action
                                    className={styles.recentAdItem}
                                    onClick={() => handleEdit(item.id)}
                                >
                                    {(currentPage - 1) * pageSize + index + 1}. {item.spotName}
                                </ListGroup.Item>
                            ))
                        ) : (
                            <p>No recent ads found.</p>
                        )}
                    </ListGroup>

                    {isSeeAll && (
                        <div className="d-flex justify-content-between align-items-center mt-4">
                            <Button
                                variant="outline-secondary"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                            >
                                <i className="bi bi-arrow-left"></i>
                            </Button>
                            <span>Page {currentPage}</span>
                            <Button
                                variant="outline-secondary"
                                onClick={handleNextPage}
                                disabled={recentAds.length < pageSize}
                            >
                                <i className="bi bi-arrow-right"></i>
                            </Button>
                        </div>
                    )}
                </Offcanvas.Body>
            </Offcanvas>

            {/* Create Ad Modal */}
            <Modal
                show={showCreateAdModal}
                onHide={() => setShowCreateAdModal(false)}
                centered
                dialogClassName={styles.customModalDialog}
                contentClassName={styles.customModalContent}
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: '#000000' }}>Enter Spot Name</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <input
                        type="text"
                        value={tmpSpotName}
                        onChange={(e) => setTmpSpotName(e.target.value)}
                        placeholder="Enter Spot Name"
                        maxLength={30}
                        className="form-control"
                        style={{ color: '#000000' }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowCreateAdModal(false)}
                        style={{
                            fontWeight: '400',
                            backgroundColor: '#FDA942',
                            borderColor: '#FDA942',
                        }}
                    >
                        Discard
                    </Button>
                    <Button
                        onClick={handleNextOnCreateAd}
                        style={{
                            fontWeight: '400',
                            backgroundColor: '#eb631c',
                            borderColor: '#eb631c',
                        }}
                        disabled={loading}  // Disable button when loading
                    >
                        {loading ? (
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                            "Next"
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default FireNavbar;
