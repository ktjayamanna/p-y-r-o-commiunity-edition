// Default values
export const initialNotesStates = {
    isNotesVisible: false,
    notes: " ",
};

// Setters
export const notesActions = (set) => ({
    toggleNotesVisibility: (isVisible) => set({ isNotesVisible: isVisible }),
    setNotes: (notes) => set({ notes }),
});

export default { initialNotesStates, notesActions };
