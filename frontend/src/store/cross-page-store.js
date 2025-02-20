// Default values
export const crossPageStates = {
    spotName: "Untitled Spot",
    spotId: null,
    currentAudioUrl: "",
    audioPlayerForceRenderKey: 0,
    audioPlayerAutoPlay: false,
    stitchedAudioPyroHistoryItemId: "",
};

// Setters
export const crossPageActions = (set) => ({
    setSpotName: (spotName) => set({ spotName }),
    setSpotId: (spotId) => set({ spotId }),
    setCurrentAudioUrl: (currentAudioUrl) => set({ currentAudioUrl }),
    setAudioPlayerForceRenderKey: (audioPlayerForceRenderKey) =>
        set({ audioPlayerForceRenderKey }),
    setAudioPlayerAutoPlay: (audioPlayerAutoPlay) =>
        set({ audioPlayerAutoPlay }),
    setStitchedAudioPyroHistoryItemId: (stitchedAudioPyroHistoryItemId) =>
        set({ stitchedAudioPyroHistoryItemId }),
});

export default { crossPageStates, crossPageActions };
