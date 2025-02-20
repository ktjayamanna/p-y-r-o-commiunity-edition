// Import your data structures
import Section from '@/dataStructures/section';
import GeneratedContent from '@/dataStructures/GeneratedContent';

// Create a default GeneratedContent
const defaultContent = new GeneratedContent();
const defaultSection = new Section({
    index: 0,
    type: 'generated',
    content: defaultContent,
});

// Default values
export const initialBuildSpotStates = {
    activeTab: '',
    sectionsArray: [defaultSection], // Initialize with default section
    sectionHistoryArray: [new Map()], // Initialize history array with a new Map
    activeSectionIndex: 0, // Set the active section index to 0
    customPronunciations: [],
    generatingIndex: null,
};

// Setters remain the same
export const buildSpotActions = (set) => ({
    setActiveTab: (tab) => set({ activeTab: tab }),
    setSectionsArray: (sectionsArray) => set({ sectionsArray }),
    setSectionHistoryArray: (sectionHistoryArray) => set({ sectionHistoryArray }),
    setActiveSectionIndex: (activeSectionIndex) => set({ activeSectionIndex }),
    setCustomPronunciations: (customPronunciations) => set({ customPronunciations }),
    setGeneratingIndex: (generatingIndex) => set({ generatingIndex }),
});

export default { initialBuildSpotStates, buildSpotActions };
