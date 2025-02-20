// components/download-logs-modal.js
import React from "react";
import { Modal, Button } from "react-bootstrap";
import DownloadLogsTable from "./download-logs-table";

export const DownloadLogsModal = ({
  show,
  handleClose,
  downloadLogs,
  unitPrice,
}) => {
  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Download Logs</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <DownloadLogsTable downloadLogs={downloadLogs} unitPrice={unitPrice} />
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={handleClose}
          style={{ backgroundColor: "#FDA942", borderColor: "#FDA942" }}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
