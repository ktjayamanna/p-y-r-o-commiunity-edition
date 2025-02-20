import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import styles from '../styles/NotesPanel.module.css';
import useGlobalStore from "@/store/global-store";


const NotesPanel = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { setActiveTab, notes, setNotes } = useGlobalStore();

    const handleClose = () => {
        setIsOpen(false);
        setActiveTab('');
    };

    const handleNotesChange = (e) => {
        setNotes(e.target.value);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.notesColumn}>
            <div className={`${styles.notesHeader} d-flex justify-content-between align-items-center`}>
                <h3 className="mb-0 fw-bold" style={{ fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif" }}>Notes</h3>
                <Button
                    variant="light"
                    onClick={handleClose}
                    className={styles.closeButton}
                >
                    <i className="bi bi-x-lg"></i>
                </Button>
            </div>
            <div className={styles.notesBody}>
                <Form.Control
                    as="textarea"
                    className={styles.notesTextarea}
                    placeholder="Add your notes here..."
                    value={notes}
                    onChange={handleNotesChange}
                />
            </div>
        </div>
    );

};

export default NotesPanel;