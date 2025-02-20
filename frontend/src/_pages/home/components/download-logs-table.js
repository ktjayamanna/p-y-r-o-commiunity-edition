import React from "react";
import { Table, Card } from "react-bootstrap";

const DownloadLogsTable = ({ downloadLogs, unitPrice }) => {
  return (
    <div
      style={{
        marginTop: "2rem",
        maxWidth: "900px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Card
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.1)", borderRadius: "1rem" }}
      >
        <Card.Body style={{ padding: "2rem" }}>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <Table striped bordered hover responsive>
              <thead style={{ backgroundColor: "#eb631c", color: "#ffffff" }}>
                <tr>
                  <th style={{ padding: "1rem", textAlign: "left" }}>
                    Downloaded File Name
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left" }}>
                    Time Stamp
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left" }}>
                    Charges
                  </th>
                </tr>
              </thead>
              <tbody>
                {downloadLogs.map((log, index) => (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "1rem", textAlign: "left" }}>
                      {log.downloadFileName}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "left" }}>
                      {new Date(log.downloadTime).toLocaleString()}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "left" }}>
                      {`${"$" + unitPrice + ".00"}`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan="2"
                    style={{ textAlign: "right", padding: "1rem" }}
                  >
                    Total Charges:
                  </td>
                  <td style={{ textAlign: "left", padding: "1rem" }}>
                    {"$" + downloadLogs.length * unitPrice + ".00"}
                  </td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DownloadLogsTable;
