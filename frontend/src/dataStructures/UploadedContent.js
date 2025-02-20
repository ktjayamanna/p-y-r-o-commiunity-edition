// File: src/dataStructures/UploadedContent.js

export default class UploadedContent {
    constructor({ audioFile = null, notes = '' } = {}) {
        this.type = 'uploaded';
        this.signature = 'fsCustomClass'; // For serialization purposes
        this.audioFile = audioFile;
        this.audioFileName = audioFile ? audioFile.name : null;
        this.notes = notes;
    }

    // Serialize method
    serialize() {
        return {
            type: this.type,
            signature: this.signature,
            audioFileName: this.audioFileName,
            notes: this.notes,
            // Note: audioFile cannot be serialized directly
        };
    }

    // Deserialize method
    static deserialize(data) {
        const uploadedContent = new UploadedContent({
            notes: data.notes,
        });
        uploadedContent.audioFileName = data.audioFileName;
        // Handle audioFile separately if possible
        return uploadedContent;
    }

    // Method to update duration by loading the audio file
    async updateDuration() {
        if (!this.audioFile) return 0;
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = URL.createObjectURL(this.audioFile);
            audio.onloadedmetadata = () => {
                resolve(audio.duration);
            };
            audio.onerror = () => {
                reject(new Error('Failed to load audio file'));
            };
        });
    }

    // Clone method
    clone() {
        // Serialize the current instance
        const serializedData = this.serialize();

        // Deserialize to create a new instance
        const cloned = UploadedContent.deserialize(serializedData);

        // Directly copy the audioFile reference
        cloned.audioFile = this.audioFile ? new File([this.audioFile], this.audioFile.name, { type: this.audioFile.type }) : null;

        return cloned;
    }

}
