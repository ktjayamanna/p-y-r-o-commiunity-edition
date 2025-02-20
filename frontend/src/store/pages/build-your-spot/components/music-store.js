// Default values
export const initialMusicStates = {
    chosenMusic: "No Music",
    previewFileName: "No Music",
    backgroundMusicFilename: "No Music",
    musicVol: 10,
};

// Setters
export const musicActions = (set) => ({
    setChosenMusic: (chosenMusic) => set({ chosenMusic }),
    setPreviewFileName: (previewFileName) => set({ previewFileName }),
    setBackgroundMusicFilename: (backgroundMusicFilename) => set({ backgroundMusicFilename }),
    setMusicVol: (musicVol) => set({ musicVol }),
});

export default { initialMusicStates, musicActions };