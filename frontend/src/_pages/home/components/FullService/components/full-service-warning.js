// src/_pages/home/components/FullService/components/FullServiceWarning.js
import React from "react";
import { Modal, Button } from "react-bootstrap";

const FullServiceWarning = ({
    show,
    handleConfirmLeaveFullService,
    handleCancelLeaveFullService,
}) => {
    return (
        <Modal show={show} onHide={handleCancelLeaveFullService} centered>
            <Modal.Body style={{ textAlign: 'center', padding: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
                    Are you sure you want to leave Full Service?
                </h2>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: '1.4' }}>
                    With Full Service, a dedicated AI expert will produce your ad as soon as today.
                    Leaving Full Service means you will lose your current progress and won't have access
                    to unlimited AI expert help.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <Button
                        variant="outline-secondary"
                        onClick={handleCancelLeaveFullService}
                        style={{ padding: '10px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', width: '48%' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleConfirmLeaveFullService}
                        style={{ padding: '10px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', width: '48%' }}
                    >
                        Leave Full Service
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default FullServiceWarning;
