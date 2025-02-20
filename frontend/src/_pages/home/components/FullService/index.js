import React from "react";
import useGlobalStore from "@/store/global-store";
import Starter from "../FullService/components/starter";
import AddScript from "../FullService/components/add-script";
import OrderSummary from "../FullService/components/order-summary";
import FullServiceVoiceSelection from "./components/FullServiceVoiceSelection";

export default function RequestFullService() {
    const {
        fullServiceStep,
        setFullServiceStep,
    } = useGlobalStore();

    const handleBack = () => {
        if (fullServiceStep > 1) setFullServiceStep(fullServiceStep - 1);
    };

    const renderStep = () => {
        switch (fullServiceStep) {
            case 1:
                return <Starter onNext={() => setFullServiceStep(2)} />;
            case 2:
                return <AddScript onNext={() => setFullServiceStep(3)} onBack={handleBack} />;
            case 3:
                return <FullServiceVoiceSelection onNext={() => setFullServiceStep(4)} onBack={handleBack} />;
            case 4:
                return <OrderSummary onBack={handleBack} />;
            default:
                return <Starter />;
        }
    };

    return (
        <div>
            {renderStep()}
        </div>
    );
}
