// Relative path: src/utils/dbReadWriteOps/deserialization-utils.js
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import app from '../../firebase';
import Section from '../../dataStructures/section';


export const checkIfExistsInFirestore = async (
  collectionName,
  docId = null,
  fieldName = null
) => {
  const db = getFirestore(app);

  try {
    if (docId) {
      const docRef = doc(db, collectionName, docId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return false;
      }
      if (fieldName) {
        return fieldName in docSnapshot.data();
      }
      return true;
    } else {
      const collectionRef = collection(db, collectionName);
      const collectionSnapshot = await getDocs(collectionRef);
      return !collectionSnapshot.empty;
    }
  } catch (error) {
    console.error(
      `Error checking existence in Firestore (${collectionName}):`,
      error
    );
    throw error;
  }
};


// Function to read spots from Firestore
export const readSpotsFromFirestore = async (spotName = null, spotId = null) => {
  if ((spotName && spotId) || (!spotName && !spotId)) {
    throw new Error('Either spotName or spotId must be provided, but not both.');
  }

  try {
    const db = getFirestore(app);

    if (spotId) {
      const docRef = doc(db, 'ads', spotId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error('No document found with the provided ID.');
      }
      return docSnapshot.data();
    } else {
      const adsCollectionRef = collection(db, 'ads');
      const q = query(adsCollectionRef, where('spotName', '==', spotName));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('No documents found with the provided spotName.');
      }
      return querySnapshot.docs[0].data(); // Assuming there's only one document per spotName
    }
  } catch (error) {
    console.error('Error reading spots from Firestore:', error);
    throw error;
  }
};

// Function to deserialize sections array
async function deserializeSectionsArray(serializedSections) {
  const sections = await Promise.all(
    serializedSections.map(async (serializedSection) => {
      const section = Section.deserialize(serializedSection);
      await section.content.updateAudioUrl(0, 3); // Assuming you pass 0 for estimatedProcessingTime and 3 for maxRetries
      return section;
    })
  );
  return sections;
}

// Function to deserialize section history array
async function deserializeSectionHistoryArray(sectionHistoryArray) {
  const updatedSectionHistoryArray = await Promise.all(
    sectionHistoryArray.map(async (section) => {
      const transformedSection = new Map();
      for (const key in section) {
        const deserializedSection = Section.deserialize(section[key]);
        await deserializedSection.content.updateAudioUrl(0, 3); // Using default values for demonstration
        transformedSection.set(key, deserializedSection);
      }
      return transformedSection;
    })
  );
  return updatedSectionHistoryArray;
}

// Function to deserialize and load mode data
export const deserializeAndLoadModeData = async ({ spotName = null, spotId = null }) => {
  const loadedData = await readSpotsFromFirestore(spotName, spotId);

  // Deep clone loadedData to avoid mutations
  const deserializedSpotData = JSON.parse(JSON.stringify(loadedData));

  // Deserialize and replace the sectionsArray
  deserializedSpotData.featureSpecificStates.sectionsArray = await deserializeSectionsArray(
    deserializedSpotData.featureSpecificStates.sectionsArray
  );

  // Deserialize and replace the sectionHistoryArray
  deserializedSpotData.featureSpecificStates.sectionHistoryArray = await deserializeSectionHistoryArray(
    deserializedSpotData.featureSpecificStates.sectionHistoryArray
  );

  // Deserialize 'sectionsArray'
  // if (
  //   deserializedSpotData.featureSpecificStates &&
  //   Array.isArray(deserializedSpotData.featureSpecificStates.sectionsArray)
  // ) {
  //   deserializedSpotData.featureSpecificStates.sectionsArray = deserializeSectionsArray(
  //     deserializedSpotData.featureSpecificStates.sectionsArray
  //   );
  // }

  // // Deserialize 'sectionHistoryArray'
  // if (
  //   deserializedSpotData.featureSpecificStates &&
  //   Array.isArray(deserializedSpotData.featureSpecificStates.sectionHistoryArray)
  // ) {
  //   // Assuming that each element in 'sectionHistoryArray' corresponds to a section in 'sectionsArray' by index
  //   const sectionHistories = deserializeSectionHistoryArray(
  //     deserializedSpotData.featureSpecificStates.sectionHistoryArray
  //   );

  //   // Assign histories to corresponding sections
  //   const sections = deserializedSpotData.featureSpecificStates.sectionsArray;
  //   sections.forEach((section, index) => {
  //     if (section.type === 'generated' && section.content) {
  //       section.content.history = sectionHistories[index];
  //     }
  //   });
  // }

  // Return the fully deserialized spot data
  return deserializedSpotData;
};
