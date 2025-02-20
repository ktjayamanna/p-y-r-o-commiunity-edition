import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import styles from '../styles/PlaceHolderPanel.module.css';
import useGlobalStore from "@/store/global-store";

const PlaceHolderPanel = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { activeTab, setActiveTab } = useGlobalStore();


    const handleClose = () => {
        setIsOpen(false);
        setActiveTab('');
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.placeHolderColumn}>
            <div className={styles.placeHolderHeader}>
                <h3>PlaceHolder</h3>
                <Button
                    variant="light"
                    onClick={handleClose}
                    className={styles.closeButton}
                >
                    <i className="bi bi-x-lg"></i>
                </Button>
            </div>
            <div className={styles.placeHolderBody}>
                {/* Add PlaceHolder controls here */}
                <p>PlaceHolder controls will be added here.</p>
            </div>
        </div>
    );
};

export default PlaceHolderPanel;