import React from 'react';
import styles from '../styles/Menu.module.css';
import useGlobalStore from "@/store/global-store";

const Menu = ({ activeTab, handleTabChange }) => {
    const {
        sectionsArray,
        setSectionsArray,
    } = useGlobalStore();

    return (
        <div className={styles.menuColumn}>
            <div
                className={`${styles.menuItem} ${activeTab === 'voice-over' ? styles.active : ''}`}
                onClick={() => handleTabChange('voice-over')}
                style={{
                    pointerEvents: sectionsArray.length === 0 ? 'none' : undefined,
                    opacity: sectionsArray.length === 0 ? 0.5 : 1,
                }}
            >
                <i className="bi bi-mic"></i>
                <span>Voiceover</span>
            </div>
            <div
                className={`${styles.menuItem} ${activeTab === 'notes' ? styles.active : ''}`}
                onClick={() => handleTabChange('notes')}
            >
                <i className="bi bi-journal-text"></i>
                <span>Notes</span>
            </div>
            <div
                className={`${styles.menuItem} ${activeTab === 'music' ? styles.active : ''}`}
                onClick={() => handleTabChange('music')}
            >
                <i className="bi bi-music-note-beamed"></i>
                <span>Music</span>
            </div>
            <div
                className={`${styles.menuItem} ${activeTab === 'pronunciation' ? styles.active : ''}`}
                onClick={() => handleTabChange('pronunciation')}
            >
                <i className="bi bi-chat-dots"></i>
                <span>Pronunciation</span>
            </div>
        </div>
    );
};

export default Menu;
