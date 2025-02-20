// Related path: src/pages/home/utils/update-state.js
import useGlobalStore from "@/store/global-store";
import { Section } from "@/dataStructures/section";
import { fetchResourceFromS3 } from "@/utils/fetch-audio/fetch-resource-from-s3";

const {
  setActiveTab,
  setSectionsArray,
  setSectionHistoryArray,
  setActiveSectionIndex,
  setSpotName,
  setSpotId,
  reset,
  setFullServiceStep,
  setFullServiceScript,
  setFullServiceAdLength,
  setFullServiceNumVoices,
  setSelectedVoices,
  setAdditionalComments,
  setMusicStyle,
  setIncludeSFX,
  setNotes,
} = useGlobalStore.getState();


export function updateStates(data) {
  return new Promise(async (resolve) => {
    // Synchronous state updates
    setSpotName(data.sharedStates.spotName);
    setSpotId(data.sharedStates.spotId);
    setNotes(data.sharedStates.notes === null ? " " : data.sharedStates.notes);  //Added this due to a bug but might lead to other issues. Be aware!
    setSectionsArray(data.featureSpecificStates.sectionsArray);
    setSectionHistoryArray(data.featureSpecificStates.sectionHistoryArray);

    // Asynchronous state updates
    try {
      const tmparr = await deserializeSectionsArray(
        data.featureSpecificStates.sectionsArray
      );
      setSectionsArray(tmparr);
      const tmpHistoryArray = await deserializeSectionHistoryArray(
        data.featureSpecificStates.sectionHistoryArray
      );
      setSectionHistoryArray(tmpHistoryArray);
      resolve(); // Resolve the promise after all async updates are done
    } catch (error) {
      console.error("Error updating state:", error);
      resolve(); // Resolve the promise also on error to not hang the promise
    }
  });
}

async function deserializeSectionsArray(serializedSections) {
  const sections = await Promise.all(
    serializedSections.map(async (serializedSection) => {
      const section = Section.deserialize(serializedSection);
      await section.updateAudioUrl(0, 3); // Assuming you pass 0 for estimatedProcessingTime and 3 for maxRetries
      return section;
    })
  );
  return sections;
}

async function deserializeSectionHistoryArray(sectionHistoryArray) {
  const updatedSectionHistoryArray = await Promise.all(
    sectionHistoryArray.map(async (section) => {
      const transformedSection = new Map();
      for (const key in section) {
        const deserializedSection = Section.deserialize(section[key]);
        await deserializedSection.updateAudioUrl(0, 3); // Using default values for demonstration
        transformedSection.set(key, deserializedSection);
      }
      return transformedSection;
    })
  );
  return updatedSectionHistoryArray;
}

function createBlobFromUrl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      const blob = await response.blob(); // Converts the response body into a Blob
      resolve(blob);
    } catch (error) {
      console.error("Error fetching the audio file:", error);
      resolve(null);
    }
  });
}

const fetchUploadedAudio = async (fileName) => {
  const response = await fetchResourceFromS3(
    "workingdir--storage",
    `save--files/${fileName}`,
    0
  );
  return response;
};
