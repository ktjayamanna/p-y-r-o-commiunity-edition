// relative path: src/store/pages/home/components/full-service/cross-component-store.js
// Default values
export const initialFullServiceStates = {
    fullServiceStep: 1,
    fullServiceScript: '',
    fullServiceAdLength: '30',
    fullServiceNumVoices: '1',
    selectedVoices: [],
    additionalComments: '',
    musicStyle: "",
    includeSFX: false,
};

// Setters
export const fullServiceActions = (set) => ({
    setFullServiceStep: (newStep) => set({ fullServiceStep: newStep }),
    setFullServiceScript: (newScript) => set({ fullServiceScript: newScript }),
    setFullServiceAdLength: (newLength) => set({ fullServiceAdLength: newLength }),
    setFullServiceNumVoices: (voices) => set({ fullServiceNumVoices: voices }),
    setSelectedVoices: (selectedVoices) => set({ selectedVoices }),
    setAdditionalComments: (additionalComments) => set({ additionalComments }),
    setMusicStyle: (musicStyle) => set({ musicStyle }),
    setIncludeSFX: (includeSFX) => set({ includeSFX }),
});

export default { initialFullServiceStates, fullServiceActions };
