// File: src/dataStructures/Section.js

import GeneratedContent from './GeneratedContent';
import UploadedContent from './UploadedContent';

export default class Section {
    constructor({ index, type, content } = {}) {
        this.index = index;
        this.type = type; // 'generated' or 'uploaded'
        this.content = content; // Instance of GeneratedContent or UploadedContent
        this.endOfSectionPauseDurationSeconds = 0.2;
        this.sectionDurationSeconds = 0;
        this.signature = 'fsCustomClass'; // For serialization purposes
    }

    // Serialize the section
    serialize() {
        return {
            index: this.index,
            type: this.type,
            endOfSectionPauseDurationSeconds: this.endOfSectionPauseDurationSeconds,
            sectionDurationSeconds: this.sectionDurationSeconds,
            content: this.content.serialize(),
            signature: this.signature,
        };
    }

    // Deserialize a snapshot to restore state
    static deserialize(data) {
        let content;
        let contentValues;
        if (data.content === undefined) {
            contentValues = data;
        } else {
            contentValues = data.content;
        }

        if (data.type === 'generated') {
            content = GeneratedContent.deserialize(contentValues);
        } else if (data.type === 'uploaded') {
            content = UploadedContent.deserialize(contentValues);
        } else { // handle legacy data
            content = GeneratedContent.deserialize(contentValues);
            data.type = 'generated';
        }

        const section = new Section({
            index: data.index,
            type: data.type,
            content: content,
        });

        section.endOfSectionPauseDurationSeconds = data.endOfSectionPauseDurationSeconds;
        section.sectionDurationSeconds = data.sectionDurationSeconds;
        section.signature = data.signature;

        return section;
    }


    // Method to update section duration
    async updateSectionDuration() {
        if (this.content && typeof this.content.updateDuration === 'function') {
            this.sectionDurationSeconds = await this.content.updateDuration();
        }
    }

    // Clone method
    clone() {
        return new Section({
            index: this.index,
            type: this.type,
            content: this.content.clone(),
            endOfSectionPauseDurationSeconds: this.endOfSectionPauseDurationSeconds,
            sectionDurationSeconds: this.sectionDurationSeconds,
            signature: this.signature,
        });
    }
}
