import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/SectionHistory.module.css';
import useGlobalStore from '@/store/global-store';

const SectionHistory = ({ sectionIndex,
    setIsSectionHistoryOpen,
    sectionHistoryArray,
    setSectionHistoryArray
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const {
        sectionsArray,
        setSectionsArray,
        setCurrentAudioUrl,
        setAudioPlayerForceRenderKey,
        setAudioPlayerAutoPlay
    } = useGlobalStore();
    const sectionHistory = sectionHistoryArray[sectionIndex] || new Map();


    const truncateText = (text, maxLength) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const handleClose = () => {
        setIsOpen(false);
        setIsSectionHistoryOpen(false);
    };

    const handlePlay = (audioBlobUrl) => {
        setCurrentAudioUrl(audioBlobUrl);
        setAudioPlayerForceRenderKey(Math.random());
        setAudioPlayerAutoPlay(true);
    };

    const handleUseRead = (historyItemId) => {

        // Retrieve the selected section based on historyItemId
        const sectionToUpdate = sectionHistoryArray[sectionIndex].get(historyItemId);

        // Update the corresponding section in the sectionsArray
        const updatedSectionsArray = [...sectionsArray];
        updatedSectionsArray[sectionIndex] = sectionToUpdate;

        // Update the global state with the new sectionsArray
        setSectionsArray(updatedSectionsArray);
    };

    return (
        <div className={`${styles.sectionHistory} border-start border-end`}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="m-0">Section {sectionIndex + 1} History</h5>
                <button
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleClose}
                ></button>
            </div>
            <div className="p-0 flex-grow-1 overflow-auto">
                {Array.from(sectionHistory).map(([historyItemId, section]) => (
                    <div key={historyItemId} className="border-bottom">
                        <div className="p-3 d-flex align-items-center">
                            <div className={styles['play-button-wrapper']}>
                                <button className={`${styles['play-button']} btn btn-sm btn-dark rounded-circle`} onClick={() => handlePlay(section.content.generatedVoiceUrl)}>
                                    <i className="bi bi-play-fill"></i>
                                </button>
                            </div>
                            <div className={`${styles['content-wrapper']} ms-3 flex-grow-1`}>
                                <div className="fw-bold">{section.content.voiceName || 'Unknown'}</div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="text-muted small">
                                        {truncateText(section.content.currentContent || '', 12)}
                                    </div>
                                    <button className={`${styles['use-read-button']} btn btn-sm btn-outline-primary`} onClick={() => handleUseRead(historyItemId)}>
                                        Use Read
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SectionHistory;