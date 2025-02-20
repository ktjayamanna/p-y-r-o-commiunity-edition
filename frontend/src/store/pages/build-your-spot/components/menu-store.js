// Default values
export const initialMenuStates = {
    sectionList: ['Section 1', 'Section 2', 'Section 3'],
};

// Setters
export const menuActions = (set) => ({
    updateSectionList: (sectionList) => set({ sectionList }),
});

export default { initialMenuStates, menuActions };
