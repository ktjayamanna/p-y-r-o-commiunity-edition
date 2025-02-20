// VoiceOverPanel/index.js
// This is just the presentational component
import React, { useState } from 'react';
import EditVoiceOver from './components/EditVoiceOver';
import VoiceSelection from './components/VoiceSelection';

const VoiceOverPanelContent = () => {
    const [selectedEmotion, setSelectedEmotion] = useState('Select emotion');
    const [showVoiceSelection, setShowVoiceSelection] = useState(false);

    const emotions = ['Neutral', 'Confidently', 'Inquisitively', 'Excitedly', 'Happily', 'Playfully', 'Warmly', 'Sadly', 'Sternly'];

    const handleSelect = (emotion) => {
        setSelectedEmotion(emotion);
    };

    const toggleVoiceSelection = () => {
        setShowVoiceSelection(!showVoiceSelection);
    };

    if (showVoiceSelection) {
        return <VoiceSelection onBack={toggleVoiceSelection} />;
    }

    return (
        <EditVoiceOver
            selectedEmotion={selectedEmotion}
            emotions={emotions}
            handleSelect={handleSelect}
            toggleVoiceSelection={toggleVoiceSelection}
        />
    );
};

export default VoiceOverPanelContent;
