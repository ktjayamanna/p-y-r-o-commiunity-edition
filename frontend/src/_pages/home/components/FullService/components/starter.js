import React from "react";
import styles from "../styles/starter.module.css";

export default function Starter({ onNext }) {
    return (
        <div className={styles.starterHeader}>
            <h1 className={styles.starterTitle}>Welcome to Full Service</h1>
            <p className={styles.starterDescription}>
                Let an AI expert handle everything from start to finish, with ads
                delivered as soon as today. Get your ads 100% right - guaranteed.
            </p>

            <div className={styles.starterStepsContainer}>
                <div className={styles.starterVerticalLine} />

                {[
                    { icon: "bi-pencil", text: "Add your script", active: true },
                    { icon: "bi-volume-up", text: "Select voice(s), music, and sound effects" },
                    { icon: "bi-check-lg", text: "Review and approve" }
                ].map((item, index) => (
                    <div key={index} className={styles.starterStep}>
                        <div className={`${styles.starterStepIcon} ${item.active ? styles.starterActive : styles.starterInactive}`}>
                            <i className={`bi ${item.icon} ${styles.starterIcon}`} />
                        </div>
                        <div className={styles.starterStepText}>{item.text}</div>
                    </div>
                ))}
            </div>

            {/* Get Started button with functionality */}
            <div className={styles.starterFooter}>
                <button className={styles.starterButton} onClick={onNext}>
                    Get Started
                </button>
            </div>
        </div>
    );
}
