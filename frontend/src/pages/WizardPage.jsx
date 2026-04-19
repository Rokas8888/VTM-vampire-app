import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useWizardStore from "../store/wizardStore";
import WizardLayout from "../components/wizard/WizardLayout";
import Step1Concept     from "../components/wizard/Step1Concept";
import Step2Clan        from "../components/wizard/Step2Clan";
import Step3Predator    from "../components/wizard/Step3Predator";
import Step4Attributes  from "../components/wizard/Step4Attributes";
import Step5Skills      from "../components/wizard/Step5Skills";
import Step6Disciplines from "../components/wizard/Step6Disciplines";
import Step7Advantages  from "../components/wizard/Step7Advantages";
import Step8Beliefs     from "../components/wizard/Step8Beliefs";
import Step9Humanity    from "../components/wizard/Step9Humanity";
import Step10Generation from "../components/wizard/Step10Generation";

export default function WizardPage() {
  const { currentStep, loadDraft, goToStep } = useWizardStore();
  const navigate = useNavigate();
  const location = useLocation();

  const addPredatorMode = !!location.state?.addPredatorMode;
  const addPredatorCharId = location.state?.characterId ?? null;

  useEffect(() => {
    // Skip loading the old draft when the player is starting a new character.
    // resetDraft() already cleared the server draft and set local state to step 1.
    if (location.state?.isNew) return;
    // When adding predator type to a complete character, jump straight to step 9.
    if (addPredatorMode) { goToStep(9); return; }
    loadDraft();
  }, []);

  const next = () => goToStep(currentStep + 1);
  const back = () => goToStep(currentStep - 1);

  // New step order:
  //  1 Concept · 2 Clan · 3 Attributes · 4 Skills · 5 Disciplines
  //  6 Advantages · 7 Beliefs · 8 Humanity · 9 Predator Type (opt) · 10 Generation
  return (
    <WizardLayout currentStep={currentStep}>
      {currentStep === 1  && <Step1Concept    onNext={next} />}
      {currentStep === 2  && <Step2Clan       onNext={next} onBack={back} />}
      {currentStep === 3  && <Step4Attributes onNext={next} onBack={back} />}
      {currentStep === 4  && <Step5Skills     onNext={next} onBack={back} />}
      {currentStep === 5  && <Step6Disciplines onNext={next} onBack={back} />}
      {currentStep === 6  && <Step7Advantages onNext={next} onBack={back} />}
      {currentStep === 7  && <Step8Beliefs    onNext={next} onBack={back} />}
      {currentStep === 8  && <Step9Humanity   onNext={next} onBack={back} />}
      {currentStep === 9  && <Step3Predator   onNext={next} onBack={back} addPredatorMode={addPredatorMode} characterId={addPredatorCharId} />}
      {currentStep === 10 && <Step10Generation onBack={back} />}
    </WizardLayout>
  );
}
