// Relative path: src/pages/home.js
import React, { useState, useEffect, use } from "react";
import { Button, Container, Row, Col, Nav, Tab, Spinner, Dropdown, Modal } from "react-bootstrap";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import app from "@/firebase";
import SpotTable from "@/_pages/home/components/spots-table";
import styles from "@/_pages/home/styles/home.module.css";
import { NotificationsPad } from "@/_pages/home/components/notifications-pad";
import RequestFullService from "@/_pages/home/components/FullService";
import FullServiceWarning from "@/_pages/home/components/FullService/components/full-service-warning"; // Updated import
import { createNewSpotInDb } from "@/utils/db-read-write-ops/serialization-utils";
import useGlobalStore from "@/store/global-store";
import { useRouter } from "next/router";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import withAuth from "@/hocs/with-auth";
import Section from '@/dataStructures/section';
import GeneratedContent from '@/dataStructures/GeneratedContent';


const Home = () => {
  const router = useRouter();
  const auth = getAuth(app);
  const currentUser = auth.currentUser;
  const db = getFirestore(app);
  const { spotName, setSpotName, setSpotId, reset, setSectionsArray } = useGlobalStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showCreateAdModal, setShowCreateAdModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLeaveFullServiceModal, setShowLeaveFullServiceModal] = useState(false);
  const [userName, setUserName] = useState([]);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [activeKey, setActiveKey] = useState("yourAds");
  const [pendingKey, setPendingKey] = useState("");
  const [isRequestFullService, setIsRequestFullService] = useState(false);

  function getGlobalStoreStates() {
    // Get the entire global store state, including actions
    const globalStore = useGlobalStore.getState();

    // Dynamically filter out actions (functions) and keep only state values
    const globalState = Object.fromEntries(
      Object.entries(globalStore).filter(([key, value]) => typeof value !== 'function')
    );
    return globalState;
  }

  useEffect(() => {
    if (currentUser) {
      const fetchUserProfile = async () => {
        try {
          setIsLoading(true);
          const userDocRef = doc(db, "uid_to_org", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName([userData?.first_name || "User", userData?.last_name || ""]);
            setTotalDownloads(userData?.monthly_downloads || 0);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setIsLoading(false);
        }
      };

      const fetchNotifications = async () => {
        try {
          const q = query(
            collection(db, "notifications"),
            where("userId", "==", currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          const notificationsData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setNotifications(notificationsData);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      };

      fetchUserProfile();
      fetchNotifications();
    }
  }, [currentUser, db]);

  const checkSpotNameExists = async (spotName) => {
    const spotsQuery = query(
      collection(db, "spots_meta_data"),
      where("spotName", "==", spotName),
      where("userId", "==", currentUser.uid)
    );
    const querySnapshot = await getDocs(spotsQuery);
    return !querySnapshot.empty;
  };

  const saveStates = async (newSpotName) => {
    reset();
    const state = getGlobalStoreStates();
    const { spotName, ...modeSpecificStates } = state; // seperate shared states
    const tmpSpotId = await createNewSpotInDb({
      spotName: newSpotName,
      mode: "isildur",
      modeSpecificStates: modeSpecificStates,
      sharedStates: { "spotName": newSpotName },
    });
    setSpotName(newSpotName);
    setSpotId(tmpSpotId);
  };

  const handleCreateAdClick = () => {
    reset();
    setShowCreateAdModal(true);
  };

  const handleNextOnCreateAd = async () => {
    if (!spotName.trim()) {
      toast.error("Please enter a name for the Spot.");
      return;
    }

    const exists = await checkSpotNameExists(spotName);
    if (exists) {
      toast.error("This spot name already exists. Please choose a different name.");
      return;
    }

    try {
      // Wait for saveStates to fully complete before proceeding
      await saveStates(spotName);
      // Create a default GeneratedContent
      const defaultContent = new GeneratedContent();
      const defaultSection = new Section({
        index: 0,
        type: 'generated',
        content: defaultContent,
      });
      setSectionsArray([defaultSection]);

      // Proceed only after the state is saved successfully
      setShowCreateAdModal(false);
      router.push("/build-your-spot");
    } catch (error) {
      // Handle errors in saveStates properly
      toast.error("Failed to save spot. Please try again.");
      console.error("Error while saving states:", error);
    }
  };



  const handleProfileClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
    }).catch((error) => {
      console.error("Logout Error:", error);
    });
  };

  const handleTabSelect = (selectedKey) => {
    if (isRequestFullService && selectedKey !== "requestFullService") {
      setPendingKey(selectedKey);
      setShowLeaveFullServiceModal(true);
    } else {
      setActiveKey(selectedKey);
      if (selectedKey === "requestFullService") {
        setIsRequestFullService(true);
      }
    }
  };

  const handleConfirmLeaveFullService = () => {
    setIsRequestFullService(false);
    setActiveKey(pendingKey);
    setShowLeaveFullServiceModal(false);
  };

  const handleCancelLeaveFullService = () => {
    setShowLeaveFullServiceModal(false);
  };
  const deleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notification) => notification.id !== id)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <Tab.Container activeKey={activeKey} onSelect={handleTabSelect}>
      <ToastContainer />
      <div className={styles.sidebarContainer}>
        {/* Sidebar Content */}
        <Nav variant="pills" className={`d-flex flex-column vh-100 p-3 ${styles.sidebar}`}>
          <Nav.Item className="mb-3">
            <img
              src="/White mic horizontal.png"
              alt="Firebay Studios Logo"
              className={styles.sidebarLogo}
            />
          </Nav.Item>

          <Nav.Item className="mb-3">
            <Button
              className={styles.createAdButton}
              onClick={handleCreateAdClick}
            >
              <i className="bi bi-plus-circle"></i> Create
            </Button>
          </Nav.Item>

          <Nav.Item>
            <Nav.Link
              eventKey="yourAds"
              className={`d-flex align-items-center ${styles.navLink}`}
            >
              <i className="bi bi-house"></i>
              <span className={styles.iconTextSpacing}>Home</span>
            </Nav.Link>
          </Nav.Item>

          {/* <Nav.Item>
            <Nav.Link
              eventKey="sharedWithMe"
              className={`d-flex align-items-center ${styles.navLink}`}
            >
              <i className="bi bi-people"></i>
              <span className={styles.iconTextSpacing}>Shared with me</span>
            </Nav.Link>
          </Nav.Item> */}

          <Nav.Item>
            <Nav.Link
              eventKey="requestFullService"
              className={`d-flex align-items-center ${styles.navLink}`}
            >
              <i className="bi bi-check-circle"></i>
              <span className={styles.iconTextSpacing}>Request Full Service</span>
            </Nav.Link>
          </Nav.Item>

          <Nav.Item>
            <Button
              variant="link"
              className={`d-flex align-items-center ${styles.navLink}`}
              onClick={() => setShowNotifications(true)}
            >
              <div className="d-inline-block">
                <i className="bi bi-bell"></i>
              </div>
              <span className={styles.iconTextSpacing}>Notifications</span>
              {notifications.length > 0 && (
                <span className={styles.notificationBadge}>
                  {notifications.length}
                </span>
              )}
            </Button>
          </Nav.Item>

          <Nav.Item className="mt-auto mb-3">
            <div className={styles.userDownloadContainer}>
              <p className={styles.userDownloadText}>Downloads this month</p>
              <p className={styles.userDownloadValue}>{totalDownloads}</p>
            </div>
          </Nav.Item>

          <Nav.Item>
            <Dropdown drop='up' show={showDropdown} onToggle={() => setShowDropdown(!showDropdown)}>
              <div
                id="dropdown-profile"
                onClick={handleProfileClick}
                className={styles.profileContainer}
              >
                <div className={styles.profileImage}>
                  {userName[0]?.slice(0, 1).toUpperCase()}
                </div>
                <span>{userName.join(" ")}</span>
              </div>
              <Dropdown.Menu align="end" className={styles.dropdownMenu}>
                <Dropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i> Sign out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav.Item>
        </Nav>

        {/* Main content */}
        <Container fluid className="p-4" style={{ backgroundColor: "white", overflowY: "auto" }}>
          {isLoading ? (
            <Row className="justify-content-center">
              <Col xs={12} className="text-center">
                <div className={styles.spinnerContainer}>
                  <Spinner
                    animation="border"
                    role="status"
                    className={styles.spinner}
                  />
                </div>
              </Col>
            </Row>
          ) : (
            <Tab.Content>
              <Tab.Pane eventKey="yourAds">
                <SpotTable />
              </Tab.Pane>
              {/* <Tab.Pane eventKey="sharedWithMe">
                <div>Shared With Me Component</div>
              </Tab.Pane> */}
              <Tab.Pane eventKey="notifications">
                <NotificationsPad
                  show={showNotifications}
                  handleClose={() => setShowNotifications(false)}
                  notifications={notifications}
                  deleteNotification={deleteNotification}

                />
              </Tab.Pane>
              <Tab.Pane eventKey="requestFullService">
                <RequestFullService />
              </Tab.Pane>
            </Tab.Content>
          )}
        </Container>
      </div>
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
            value={spotName}
            onChange={(e) => setSpotName(e.target.value)}
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
          >
            Next
          </Button>
        </Modal.Footer>
      </Modal>


      <FullServiceWarning
        show={showLeaveFullServiceModal}
        handleConfirmLeaveFullService={handleConfirmLeaveFullService}
        handleCancelLeaveFullService={handleCancelLeaveFullService}
      />

    </Tab.Container>
  );
};

export default withAuth(Home)
