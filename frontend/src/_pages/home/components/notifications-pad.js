import React from 'react';
import { Offcanvas, Button } from 'react-bootstrap';
import { formatDate } from "@/utils/time/current-timestamp";

export const NotificationsPad = ({ show, handleClose, notifications, deleteNotification }) => {
    return (
        <Offcanvas show={show} onHide={handleClose} placement="end" style={{ width: '500px' }}>
            <Offcanvas.Header closeButton style={{ borderBottom: 'none', padding: '20px' }}>
                <Offcanvas.Title style={{ fontSize: '24px', fontWeight: 'bold' }}>Notifications</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body style={{ backgroundColor: '#f8f9fa', padding: '0 20px 20px' }}>
                {notifications.map(notification => (
                    <div key={notification.id} className="notification-item" style={{
                        marginBottom: '15px',
                        marginTop: '15px',
                        padding: '15px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <strong style={{ color: '#000000', fontSize: '16px', display: 'block', marginBottom: '5px' }}>
                                    {notification.title}
                                </strong>
                                <span style={{ color: '#666', fontSize: '14px' }}>{formatDate(notification.timestamp)}</span>
                            </div>
                            <Button variant="link" size="sm" onClick={() => deleteNotification(notification.id)} style={{ padding: 0 }}>
                                <i className="bi bi-x" style={{ color: '#000000', fontSize: '20px' }}></i>
                            </Button>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '15px', color: '#333' }}>
                            {notification.message}
                        </div>
                    </div>
                ))}
            </Offcanvas.Body>
        </Offcanvas>
    );
};
