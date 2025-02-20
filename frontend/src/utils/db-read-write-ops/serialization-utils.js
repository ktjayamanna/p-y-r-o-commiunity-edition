//Relative path: src/utils/dbReadWriteOps/serializationUtils.js
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import app from "../../firebase";
import { getAuth } from "firebase/auth";

const isCustomClass = (obj) => obj?.signature === "fsCustomClass";
const auth = getAuth(app);

export const writeToFirestore = async (collectionName, data, docId = null) => {
  const db = getFirestore(app);
  const collectionRef = collection(db, collectionName);

  let docRef;
  if (docId) {
    // Updating an existing document
    docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  } else {
    // Creating a new document
    docRef = await addDoc(collectionRef, data);
  }
  return docRef.id;
};

const writeSpotMetaDataToFirestore = async ({
  spotName,
  spotId,
  mode,
  created,
  lastDownloaded,
  lastEdited,
}) => {
  const userId = auth.currentUser.uid;

  // Prepare the data to be written
  const data = {
    userId,
    spotName,
    mode,
    created,
    lastDownloaded,
    lastEdited,
  };

  try {
    // Use the writeToFirestore function to write data
    const documentId = await writeToFirestore("spots_meta_data", data, spotId);
    return documentId;
  } catch (error) {
    console.error("Error writing spot meta data to db:", error);
    throw error; // Rethrow the error for upstream handling
  }
};

const writeSpotStatesToFirestore = async (
  data,
  spotName = null,
  spotId = null
) => {
  // Assert that exactly one of spotName or spotId is provided
  if ((spotName && spotId) || (!spotName && !spotId)) {
    throw new Error(
      "Either spotName or spotId must be provided, but not both."
    );
  }

  try {
    let docId = spotId;
    let documentData = { ...data };

    // Include spotName in the data if creating a new document
    if (!docId && spotName) {
      documentData.spotName = spotName;
    }

    // Write to Firestore using the abstracted function
    const documentId = await writeToFirestore("ads", documentData, docId);
    return documentId; // Returning the document ID
  } catch (error) {
    console.error("Error writing document to db:", error);
    throw error; // Rethrow the error for upstream handling
  }
};

const serializeProperties = (dataObject) => {
  if (Array.isArray(dataObject)) {
    return dataObject.map(serializeProperties);
  } else if (dataObject instanceof Map) {
    const result = {};
    dataObject.forEach((value, key) => {
      result[key] = serializeProperties(value);
    });
    return result;
  } else if (dataObject && typeof dataObject === "object") {
    return Object.keys(dataObject).reduce((serializedResult, key) => {
      const value = dataObject[key];
      if (isCustomClass(value)) {
        serializedResult[key] = value.serialize();
      } else if (typeof value === "object") {
        serializedResult[key] = serializeProperties(value);
      } else {
        serializedResult[key] = value;
      }
      return serializedResult;
    }, {});
  }
  return dataObject;
};

const serializeAndWriteSpotStates = async ({
  userId,
  modeSpecificStates,
  sharedStates,
  spotId,
}) => {
  const serializedModeSpecificStates = serializeProperties(modeSpecificStates);
  const serializedSharedStates = serializeProperties(sharedStates);

  const data = {
    userId,
    featureSpecificStates: serializedModeSpecificStates,
    sharedStates: serializedSharedStates,
  };

  // Write main spot data
  const finalSpotId = await writeSpotStatesToFirestore(data, null, spotId);

  return finalSpotId;
};

export const createNewSpotInDb = async ({
  spotName,
  mode,
  modeSpecificStates,
  sharedStates,
}) => {
  const userId = auth.currentUser.uid;

  // Write spot metadata first and obtain the spotId
  const savedSpotId = await writeSpotMetaDataToFirestore({
    spotName,
    spotId: null, // New spot, so no existing spotId
    mode,
    created: new Date(),
    lastDownloaded: null,
    lastEdited: new Date(),
  });

  // Update the spotId in sharedStates
  sharedStates.spotId = savedSpotId;

  // Serialize and write spot states
  const finalSpotId = await serializeAndWriteSpotStates({
    userId,
    modeSpecificStates,
    sharedStates,
    spotId: savedSpotId,
  });

  return finalSpotId;
};

export const updateExistingSpotInDb = async ({
  spotId,
  modeSpecificStates,
  sharedStates,
}) => {
  const userId = auth.currentUser.uid;

  if (!spotId) {
    throw new Error("spotId must be provided when updating an existing spot.");
  }

  // Serialize and write spot states without modifying spotId in sharedStates
  const finalSpotId = await serializeAndWriteSpotStates({
    userId,
    modeSpecificStates,
    sharedStates,
    spotId,
  });

  // Update the spots_meta_data collection with the lastEdited field
  const data = {
    lastEdited: new Date().toISOString(),
  };

  await writeToFirestore('spots_meta_data', data, spotId);

  return finalSpotId;
};
