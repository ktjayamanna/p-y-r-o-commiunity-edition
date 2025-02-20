// Default values
export const initialFullServiceVOSelectionStates = {
    selectedVoices: [],
    additionalComments: '',
    musicStyle: "Rock: Electro Sport",
    includeSFX: false,



};

// Setters
export const fullServiceVOSelectionActions = (set) => ({

    setSelectedVoices: (selectedVoices) => set({ selectedVoices }),
    setAdditionalComments: (additionalComments) => set({ additionalComments }),
    setMusicStyle: (musicStyle) => set({ musicStyle }),
    setIncludeSFX: (includeSFX) => set({ includeSFX }),

});

export default { initialFullServiceVOSelectionStates, fullServiceVOSelectionActions };
