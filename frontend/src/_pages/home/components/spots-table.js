import React, { useState, useEffect } from "react";
import { Table, Button, Alert, Dropdown, Form, InputGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Timestamp, getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import app from "@/firebase";
import { getAuth } from "firebase/auth";
import styles from '@/_pages/home/styles/spots-table.module.css';
import {
  deserializeAndLoadModeData,
} from "@/utils/db-read-write-ops/deserialization-utils";
import {
  updateStates
} from "@/_pages/home/utils/update-state";
import Swal from 'sweetalert2';

// Import global store
import useGlobalStore from '@/store/global-store';
import { useRouter } from "next/router";


const SpotTable = () => {
  const db = getFirestore(app);
  const router = useRouter();
  const [spots, setSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [editingSpotId, setEditingSpotId] = useState(null);
  const [newSpotName, setNewSpotName] = useState("");

  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  const { setSpotName } = useGlobalStore();

  const fetchSpots = async () => {
    setIsLoading(true);
    setError(null);  // Reset error before fetching
    try {
      if (!userId) throw new Error("User not authenticated");
      const spotsQuery = query(
        collection(db, "spots_meta_data"),
        where("userId", "==", userId),
        where("mode", "in", ["isildur", "advanced-script-to-ad"])
      );
      const querySnapshot = await getDocs(spotsQuery);
      const fetchedSpots = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const createdDate = data.created ? data.created.toDate() : null;
        return {
          id: doc.id,
          spotName: data.spotName || "-",
          voiceName: data.voiceName || "TBD",
          adLength: data.adLength || "-",
          createdRaw: createdDate,
          created: createdDate ? createdDate.toLocaleString() : "-",
          lastDownloaded: data.lastDownloaded
            ? data.lastDownloaded.toDate().toLocaleString()
            : "Never",
          downloadLogs: data.downloadLogs || [],
          mode: data.mode || "isildur",
          lastEdited:
            data.lastEdited instanceof Timestamp
              ? data.lastEdited.toDate().toLocaleString()
              : "-",
        };
      });

      fetchedSpots.sort((a, b) =>
        b.createdRaw ? b.createdRaw - a.createdRaw : 0
      );

      setSpots(fetchedSpots);
      setFilteredSpots(fetchedSpots);
    } catch (error) {
      console.error("Error fetching spots:", error);
      setError(`Error fetching spots: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const height = window.innerHeight;
      if (height >= 1300) {
        setPageSize(15);
      } else if (height >= 1100) {
        setPageSize(13);
      } else if (height >= 900) {
        setPageSize(10);
      } else if (height >= 700) {
        setPageSize(6);
      } else if (height >= 500) {
        setPageSize(3);
      } else {
        setPageSize(1);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const filtered = spots.filter(spot =>
      spot.spotName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSpots(filtered);
    setCurrentTableIndex(0);
  }, [searchTerm, spots]);

  const handleNextPage = () => {
    if (currentTableIndex + pageSize < filteredSpots.length) {
      setCurrentTableIndex(currentTableIndex + pageSize);
    }
  };

  const handlePreviousPage = () => {
    if (currentTableIndex - pageSize >= 0) {
      setCurrentTableIndex(currentTableIndex - pageSize);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds === '-') {
      return "--:--";
    }
    const mins = Math.floor(parseInt(seconds) / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  async function handleEdit(spotId) {
    const data = await deserializeAndLoadModeData({ spotId });
    setSpotName(data.sharedStates.spotName);
    await updateStates(data);
    router.push("/build-your-spot");
  }

  const handleOptionsClick = (spotId) => {
    console.log("Options clicked for spot id:", spotId);
  };

  // renaming
  const handleRename = (spotId, currentName) => {
    setEditingSpotId(spotId);
    setNewSpotName(currentName);
  };

  const handleRenameChange = (e) => {
    setNewSpotName(e.target.value);
  };

  const handleRenameBlur = () => {
    if (newSpotName.trim() !== "") {
      updateSpotName(editingSpotId, newSpotName);
    }
    setEditingSpotId(null);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateSpotName(editingSpotId, newSpotName);
      setEditingSpotId(null);
    }
  };

  const updateSpotName = async (spotId, newName) => {
    const trimmedName = newName.trim();
    if (trimmedName === "") {
      toast.error("Please enter a valid name for the spot.");
      return;
    }

    const currentSpot = spots.find(spot => spot.id === spotId);
    if (currentSpot && currentSpot.spotName === trimmedName) {
      setEditingSpotId(null);
      return; // No changes, exit early
    }

    const db = getFirestore(app);
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    try {
      // Query to check if the new spot name already exists for this user
      const spotsRef = collection(db, "spots_meta_data");
      const q = query(spotsRef,
        where("userId", "==", currentUser.uid),
        where("spotName", "==", trimmedName)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast.error("This spot name already exists. Please choose a different name.");
        return;
      }

      // Perform the update operations
      const spotRef = doc(db, "spots_meta_data", spotId);
      const adRef = doc(db, "ads", spotId);
      await updateDoc(spotRef, { spotName: trimmedName });
      await updateDoc(adRef, { "sharedStates.spotName": trimmedName });
      toast.success("Spot name updated successfully.");

      // Update the local state
      setSpots(spots.map(spot =>
        spot.id === spotId ? { ...spot, spotName: trimmedName } : spot
      ));
      setFilteredSpots(filteredSpots.map(spot =>
        spot.id === spotId ? { ...spot, spotName: trimmedName } : spot
      ));
    } catch (error) {
      console.error("Error updating spot name:", error);
      toast.error(`Update failed: ${error.message}`);
    }
  };

  const handleRenameDoubleClick = (spotId, currentName) => {
    setEditingSpotId(spotId);
    setNewSpotName(currentName);
  };

  const handleDuplicate = async (spotId) => {
    try {
      const spotRef = doc(db, "spots_meta_data", spotId);
      const adRef = doc(db, "ads", spotId);

      const spotSnap = await getDoc(spotRef);
      const adSnap = await getDoc(adRef);

      if (!spotSnap.exists() || !adSnap.exists()) {
        toast.error("Original spot data not found.");
        return;
      }

      const originalSpotData = spotSnap.data();
      const originalAdData = adSnap.data();
      const originalSpotName = originalSpotData.spotName || "Untitled";
      const newCopySpotName = `${originalSpotName}--copy`;
      const now = new Date();

      // Create new duplicated spot
      const newSpotMetaRef = doc(collection(db, "spots_meta_data"));
      const newSpotData = {
        ...originalSpotData,
        spotName: newCopySpotName,
        created: now,
        downloadLogs: [],
        lastDownloaded: null, // Reset lastDownloaded
        lastEdited: now,
      };
      await setDoc(newSpotMetaRef, newSpotData);

      // Duplicate the corresponding ad data
      const newAdRef = doc(db, "ads", newSpotMetaRef.id);
      const newAdData = {
        ...originalAdData,
        sharedStates: {
          ...originalAdData.sharedStates,
          spotId: newSpotMetaRef.id,
          spotName: newCopySpotName,
        },
      };
      await setDoc(newAdRef, newAdData);

      const newSpot = {
        id: newSpotMetaRef.id,
        spotName: newCopySpotName,
        voiceName: originalSpotData.voiceName || "TBD",
        adLength: originalSpotData.adLength || "-",
        created: now.toLocaleString(),
        createdRaw: now,
        lastDownloaded: "Never",
        downloadLogs: [],
        mode: originalSpotData.mode || "isildur",
        lastEdited: now.toLocaleString(),
      };

      // Add the new spot to the spots list and update UI
      const updatedSpots = [
        ...spots.map((spot) => ({
          ...spot,
          createdRaw: new Date(spot.createdRaw || spot.created),
        })),
        newSpot,
      ].sort((a, b) => (b.createdRaw ? b.createdRaw - a.createdRaw : 0));

      setSpots(updatedSpots);
      setFilteredSpots(updatedSpots);

      // Set the new spot for editing (auto-rename)
      setEditingSpotId(newSpot.id);
      setNewSpotName(newCopySpotName);

      toast.success("Spot duplicated successfully!");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error(`Failed to duplicate spot: ${error.message}`);
    }
  };

  const handleDelete = async (spotId) => {
    try {
      const confirmation = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });

      if (confirmation.isConfirmed) {
        const spotRef = doc(db, "spots", spotId);
        const spotMetaRef = doc(db, "spots_meta_data", spotId);
        const adsRef = doc(db, "ads", spotId);

        await deleteDoc(spotRef);
        await deleteDoc(spotMetaRef);
        await deleteDoc(adsRef);

        const updatedSpots = spots.filter((spot) => spot.id !== spotId);
        setSpots(updatedSpots);
        setFilteredSpots(updatedSpots);

        Swal.fire({
          title: "Spot Deleted",
          text: "Spot deleted successfully!",
          icon: "success",
        });
      }
    } catch (error) {
      console.error("Failed to delete spot and associated data:", error);
      Swal.fire({
        title: "Deletion Failed",
        text: error.message,
        icon: "error",
      });
    }
  };


  return (
    <div>
      <InputGroup className="mb-3">
        <InputGroup.Text id="search-addon">
          <i className="bi bi-search"></i>
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="Search spots..."
          aria-label="Search spots"
          aria-describedby="search-addon"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      ) : filteredSpots.length === 0 ? (
        <Alert variant="info" className="text-center">
          {spots.length === 0
            ? "Welcome to Pyro! Click on the 'Create a new Spot' button above to get started!"
            : "No spots found matching your search."}
        </Alert>
      ) : (
        <Table borderless className={styles["custom-table"]}>
          <thead>
            <tr>
              <th>#</th>
              <th>Spot Name</th>
              <th>Voice</th>
              <th>Duration</th>
              <th>Date created</th>
            </tr>
          </thead>
          <tbody>
            {filteredSpots.slice(currentTableIndex, currentTableIndex + pageSize).map((spot, index) => (
              <tr key={spot.id}>
                <td>{currentTableIndex + index + 1}</td>
                <td>
                  {editingSpotId === spot.id ? (
                    <Form.Control
                      type="text"
                      maxLength={30}
                      value={newSpotName}
                      onChange={handleRenameChange}
                      onBlur={handleRenameBlur}
                      onKeyDown={handleRenameKeyDown}
                      autoFocus
                      className={styles.editableProjectName}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => handleRenameDoubleClick(spot.id, spot.spotName)}
                      style={{ cursor: 'pointer' }}
                    >
                      {spot.spotName || "-"}
                    </span>
                  )}
                </td>
                <td>{spot.voiceName || "TBD"}</td>
                <td>{spot.adLength ? formatDuration(spot.adLength) : "-"}</td>
                <td>{spot.created || "-"}</td>
                <td className={styles["table-buttons"]}>
                  <Button
                    onClick={() => handleEdit(spot.id)}
                    className={styles["edit-button"]}
                  >
                    Edit
                  </Button>
                  <Dropdown>
                    <Dropdown.Toggle as="div" bsPrefix="custom-dropdown">
                      <i className="bi bi-three-dots"></i>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleRename(spot.id, spot.spotName)}>
                        Rename
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleDuplicate(spot.id)}>
                        Duplicate
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleDelete(spot.id)}>
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className={styles["pagination-container"]}>
        <button
          onClick={handlePreviousPage}
          disabled={currentTableIndex === 0}
          className="btn btn-outline-secondary btn-md"
        >
          &lt;
        </button>
        <button
          onClick={handleNextPage}
          disabled={currentTableIndex + pageSize >= filteredSpots.length}
          className="btn btn-outline-secondary btn-md"
        >
          &gt;
        </button>
      </div>
      <hr className="my-4 border-t border-black opacity-200" />
    </div>
  );
};

export default SpotTable;
