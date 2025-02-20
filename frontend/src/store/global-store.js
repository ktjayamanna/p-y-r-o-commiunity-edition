import { create } from "zustand";
import {
    initialMenuStates,
    menuActions,
    initialNotesStates,
    notesActions,
    initialBuildSpotStates,
    buildSpotActions,
    initialMusicStates,
    musicActions,
} from "./pages/build-your-spot";

import {
    initialFullServiceStates,
    fullServiceActions,
    initialFullServiceVOSelectionStates,
    fullServiceVOSelectionActions,
} from "./pages/home";

import { crossPageStates, crossPageActions } from "./cross-page-store";

// Step 1: Combine all initial states into a single object
const initialState = {
    ...crossPageStates,
    ...initialMenuStates,
    ...initialMusicStates,
    ...initialNotesStates,
    ...initialBuildSpotStates,
    ...initialFullServiceStates,
    ...initialFullServiceVOSelectionStates,
};

// Step 2: Combine all actions into a single function
const actions = (set) => ({
    ...fullServiceVOSelectionActions(set),
    ...crossPageActions(set),
    ...menuActions(set),
    ...musicActions(set),
    ...notesActions(set),
    ...buildSpotActions(set),
    ...fullServiceActions(set),
});

// Step 3: Create the Zustand store using the consolidated initialState and actions
const useGlobalStore = create((set) => ({
    ...initialState,
    ...actions(set),
    reset: () =>
        new Promise((resolve) => {
            set(
                { ...initialState },
                false,
                "reset"
            );
            resolve();
        }),
}));

export default useGlobalStore;
