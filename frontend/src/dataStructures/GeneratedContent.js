// File: src/dataStructures/GeneratedContent.js

import {
    fetchAudioFromPyroBackendDistribution,
    fetchAudioFromElevenLabs,
} from '@/utils/fetch-audio/fetch-from-distribution';

export default class GeneratedContent {
    constructor({
        originalContent = '',
        currentContent = '',
        historyItemId = null,
        speechRate = 0,
        modelId = 'eleven_multilingual_v2',
        voiceId = '6wLJ4Wm2OxvAvetEUBCS',
        voiceName = 'Charley',
        voicePreviewFilename = 'male/charley.mp3',
        emotion = 'Neutral',
        intonationConsistencyLevel = 0,
        generatedVoiceUrl = '',
        notes = '',
        currentTransformations = {},
        currentWords = [],
    } = {}) {
        this.type = 'generated';
        this.signature = 'fsCustomClass'; // For serialization purposes
        this.originalContent = originalContent;
        this.currentContent = currentContent;
        this.currentTransformations = currentTransformations; // Transformed words with indexes
        this.currentWords = currentWords.length > 0 ? currentWords : originalContent.split(' '); // Raw words
        this.historyItemId = historyItemId; // Tied to GeneratedContent
        this.originalCharCount = this.calculateCharCount(originalContent);
        this.currentCharCount = this.calculateCharCount(currentContent);
        this.speechRate = speechRate;
        this.modelId = modelId;
        this.voiceId = voiceId;
        this.voiceName = voiceName;
        this.voicePreviewFilename = voicePreviewFilename;
        this.emotion = emotion;
        this.intonationConsistencyLevel = intonationConsistencyLevel;
        this.generatedVoiceUrl = generatedVoiceUrl;
        this.notes = notes;
    }

    // Method to calculate character count
    calculateCharCount(content) {
        const contentWithoutApostrophes = content.replace(/'/g, '');
        return contentWithoutApostrophes.trim().length;
    }

    // Serialize method
    serialize() {
        return {
            type: this.type,
            signature: this.signature,
            originalContent: this.originalContent,
            currentContent: this.currentContent,
            currentTransformations: this.currentTransformations,
            currentWords: this.currentWords,
            historyItemId: this.historyItemId,
            originalCharCount: this.originalCharCount,
            currentCharCount: this.currentCharCount,
            speechRate: this.speechRate,
            modelId: this.modelId,
            voiceId: this.voiceId,
            voiceName: this.voiceName,
            voicePreviewFilename: this.voicePreviewFilename,
            emotion: this.emotion,
            intonationConsistencyLevel: this.intonationConsistencyLevel,
            generatedVoiceUrl: this.generatedVoiceUrl,
            notes: this.notes,
        };
    }

    // Deserialize method
    static deserialize(data) {
        const generatedContent = new GeneratedContent(data);
        return generatedContent;
    }

    // Method to update duration (estimate based on character count)
    updateDuration() {
        const averageCharsPerSecond = 15; // Adjust as needed
        return this.currentCharCount / averageCharsPerSecond;
    }

    // Method to update audio URL
    async updateAudioUrl(estimatedProcessingTime = 0, maxRetries = 3) {
        if (this.historyItemId) {
            try {
                let audioUrl;
                if (this.historyItemId.startsWith('pyro_')) {
                    audioUrl = await fetchAudioFromPyroBackendDistribution(
                        this.historyItemId,
                        estimatedProcessingTime,
                        maxRetries
                    );
                } else {
                    audioUrl = await fetchAudioFromElevenLabs(this.historyItemId);
                }
                this.generatedVoiceUrl = audioUrl;
            } catch (error) {
                console.error('Failed to update audio URL:', error.message);
            }
        } else {
            console.log('History item ID is not set.');
        }
    }

    clone() {
        return GeneratedContent.deserialize(this.serialize());
    }
}
