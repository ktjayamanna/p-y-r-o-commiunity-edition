import React, { useState, useEffect } from "react";
import { Offcanvas, Button, Form } from "react-bootstrap";

const emphasisButtonStyles = {
    emphasizeLevel1: { borderColor: "#ff8a35" },
    emphasizeLevel2: { borderColor: "#d85b00" },
    emphasizeLevel3: { borderColor: "#8a3a00" },
    removeEmphasis: { borderColor: "#000000" },
    cancel: { borderColor: "#ffba87" }
};

// Custom pronunciations data
const customPronunciations = [
    {
        "id": "ShOQijdLa9WEWVl1JhMo",
        "word": "sad",
        "pronunciation": "zc",
        "createdAt": {
            "seconds": 1728508311,
            "nanoseconds": 356000000
        },
        "case_sensitivity": false
    },
    {
        "id": "WtF2kq7LWiWgMacsyIh4",
        "pronunciation": "eed",
        "case_sensitivity": false,
        "createdAt": {
            "seconds": 1729429519,
            "nanoseconds": 475000000
        },
        "word": "gh"
    },
    {
        "id": "kJQPP9dq1ZW4HyvYoaZw",
        "case_sensitivity": true,
        "pronunciation": "meee",
        "word": "test",
        "createdAt": {
            "seconds": 1729605434,
            "nanoseconds": 163000000
        }
    }
];

const WordSmithOffcanvas = ({
    offcanvasVisible,
    hideOffcanvas,
    sections,
    setSections,
    selectedSectionIndex
}) => {
    // Function to get custom pronunciation
    const getPronunciation = (word) => {
        const entry = customPronunciations.find(item =>
            item.case_sensitivity
                ? item.word === word
                : item.word.toLowerCase() === word.toLowerCase()
        );
        return entry ? entry.pronunciation : word;
    };

    // Local state for currentSection and content
    const [currentSection, setCurrentSection] = useState(sections[selectedSectionIndex]);
    const [content, setContent] = useState(currentSection.content.clone());

    // Update currentSection and content when sections or selectedSectionIndex change
    useEffect(() => {
        const newCurrentSection = sections[selectedSectionIndex];
        setCurrentSection(newCurrentSection);
        setContent(newCurrentSection.content.clone());
    }, [sections, selectedSectionIndex]);

    const [showOptions, setShowOptions] = useState(false);
    const [selectedWordIndex, setSelectedWordIndex] = useState(null);

    const currentContent = content.currentContent;
    const [currentWords, setCurrentWords] = useState(currentContent.split(" "));
    const [currentTransformations, setCurrentTransformations] = useState({ ...content.currentTransformations });

    // Update currentWords when currentContent changes
    useEffect(() => {
        setCurrentWords(currentContent.split(" "));
    }, [currentContent]);

    // Synchronize currentTransformations when currentWords change
    useEffect(() => {
        const newTransformations = { ...currentTransformations };
        Object.keys(newTransformations).forEach(index => {
            const idx = parseInt(index, 10);
            if (
                !currentWords[idx] ||
                newTransformations[idx].originalWord !== currentWords[idx]
            ) {
                delete newTransformations[idx];
            }
        });
        setCurrentTransformations(newTransformations);

        // Update content.currentTransformations
        const updatedContent = content.clone();
        updatedContent.currentTransformations = newTransformations;
        setContent(updatedContent);

        // Clone the section and update content
        const newSection = currentSection.clone();
        newSection.content = updatedContent;

        // Update sections
        const newSections = [...sections];
        newSections[selectedSectionIndex] = newSection;
        setSections(newSections);
    }, [currentWords]);

    const transformWord = (action) => {
        if (selectedWordIndex === null) return;

        const originalWord = currentWords[selectedWordIndex];
        const pronunciation = getPronunciation(originalWord);

        const transformedPronunciation = {
            emphasizeLevel1: pronunciation.toUpperCase(),
            emphasizeLevel2: `'${pronunciation}'`,
            emphasizeLevel3: `'${pronunciation.toUpperCase()}'`,
            removeEmphasis: pronunciation
        }[action] || pronunciation;

        // Clone the content and update transformations
        const newContent = content.clone();
        if (action === "removeEmphasis") {
            delete newContent.currentTransformations[selectedWordIndex];
        } else {
            newContent.currentTransformations[selectedWordIndex] = {
                originalWord: originalWord,
                transformedWord: transformedPronunciation,
                action: action
            };
        }

        // Update the content in state
        setContent(newContent);
        setCurrentTransformations({ ...newContent.currentTransformations });

        // Clone the section and update content
        const newSection = currentSection.clone();
        newSection.content = newContent;

        // Update sections
        const newSections = [...sections];
        newSections[selectedSectionIndex] = newSection;
        setSections(newSections);

        setSelectedWordIndex(null);
        setShowOptions(false);
    };

    const renderWord = (word, index) => {
        const transformedItem = currentTransformations[index];
        let displayedWord;
        let borderColor = emphasisButtonStyles.removeEmphasis.borderColor;

        if (transformedItem) {
            displayedWord = transformedItem.transformedWord;
            const { action } = transformedItem;
            borderColor = emphasisButtonStyles[action].borderColor;
        } else {
            displayedWord = getPronunciation(word);
        }

        return (
            <span
                key={index}
                style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: "15px",
                    fontSize: "1.1rem",
                    fontWeight: "500",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    transition: "all 0.3s ease",
                    border: `2px solid ${borderColor}`
                }}
                onMouseEnter={e => (e.target.style.backgroundColor = "#ffecd1")}
                onMouseLeave={e => (e.target.style.backgroundColor = "#f8f9fa")}
                onClick={() => {
                    setSelectedWordIndex(index);
                    setShowOptions(true);
                }}
            >
                {displayedWord}
            </span>
        );
    };

    return (
        <Offcanvas
            show={offcanvasVisible}
            onHide={hideOffcanvas}
            placement="bottom"
            style={{
                width: "100%",
                height: "50%",
                minHeight: "30%",
                backgroundColor: "#f8f9fa",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                borderRadius: "15px 15px 0 0"
            }}
        >
            <Offcanvas.Header
                closeButton
                style={{
                    backgroundColor: "#f8f9fa",
                    borderBottom: "1px solid #eb631c",
                    borderRadius: "15px 15px 0 0"
                }}
            >
                <Offcanvas.Title
                    style={{
                        fontSize: "1.25rem",
                        display: "block",
                        textAlign: "left",
                        fontFamily: "'Times New Roman', Times, serif",
                        color: "#4a4a4a"
                    }}
                >
                    {showOptions ? (
                        <>
                            Select an option to emphasize the chosen word:{" "}
                            <span
                                style={{
                                    fontFamily: "'Times New Roman', Times, serif",
                                    fontWeight: "bold",
                                    color: "#EB631C",
                                    fontSize: "1.5rem",
                                    fontStyle: "italic"
                                }}
                            >
                                {getPronunciation(currentWords[selectedWordIndex])}
                            </span>
                        </>
                    ) : (
                        "Change Emphasis"
                    )}
                </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body
                style={{
                    overflowY: "auto",
                    padding: "20px",
                    backgroundColor: "#f8f9fa"
                }}
            >
                {!showOptions ? (
                    <>
                        <Form.Label
                            style={{
                                fontSize: "1rem",
                                color: "#4a4a4a",
                                fontFamily: "'Times New Roman', Times, serif"
                            }}
                        >
                            Click on a word to change its emphasis (Custom Pronounciations are already added)
                        </Form.Label>
                        <div
                            className="bg-light p-3 rounded mt-3"
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "10px",
                                backgroundColor: "#ffffff",
                                boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.1)"
                            }}
                        >
                            {currentWords.map(renderWord)}
                        </div>
                    </>
                ) : (
                    <div className="mt-4" style={{ textAlign: "center" }}>
                        {["emphasizeLevel3", "emphasizeLevel2", "emphasizeLevel1", "removeEmphasis", "cancel"].map(
                            level => (
                                <Button
                                    key={level}
                                    variant="outline-dark"
                                    className="me-2"
                                    style={{
                                        ...emphasisButtonStyles[level],
                                        borderRadius: "20px",
                                        fontWeight: "bold",
                                        border: `2px solid ${emphasisButtonStyles[level].borderColor}`
                                    }}
                                    onMouseEnter={e => {
                                        e.target.style.backgroundColor =
                                            emphasisButtonStyles[level].borderColor;
                                        e.target.style.color = "#ffffff";
                                    }}
                                    onMouseLeave={e => {
                                        e.target.style.backgroundColor = "transparent";
                                        e.target.style.color = "#000000";
                                    }}
                                    onClick={() =>
                                        level === "cancel"
                                            ? setShowOptions(false)
                                            : transformWord(level)
                                    }
                                >
                                    {level === "emphasizeLevel3"
                                        ? "High Emphasis"
                                        : level === "emphasizeLevel2"
                                            ? "Medium Emphasis"
                                            : level === "emphasizeLevel1"
                                                ? "Low Emphasis"
                                                : level === "removeEmphasis"
                                                    ? "Remove Emphasis"
                                                    : "Cancel"}
                                </Button>
                            )
                        )}
                    </div>
                )}
            </Offcanvas.Body>
        </Offcanvas>
    );
};

export default WordSmithOffcanvas;
