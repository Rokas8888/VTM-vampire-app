import useWizardStore from "../../store/wizardStore";

const STEPS = [
  "Concept", "Clan", "Attributes", "Skills",
  "Disciplines", "Advantages", "Beliefs", "Humanity",
  "Predator", "Generation"
];

export default function WizardLayout({ currentStep, children }) {
  const goToStep = useWizardStore((state) => state.goToStep);
  const progress = (currentStep / 10) * 100;

  return (
    <div className="min-h-screen bg-void text-gray-200">
      {/* Header */}
      <div className="border-b border-void-border bg-void-light px-3 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            {/* Back button — hidden on step 1 */}
            {currentStep > 1 ? (
              <button
                onClick={() => goToStep(currentStep - 1)}
                className="text-gray-500 hover:text-blood transition-colors text-sm font-gothic tracking-wider"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <h1 className="font-gothic text-2xl text-blood">Character Creation</h1>
            <span className="text-gray-500 text-sm font-gothic">
              {currentStep} / 10 — {STEPS[currentStep - 1]}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-void-border rounded-full h-1">
            <div
              className="bg-blood h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step number indicators */}
          <div className="flex justify-between mt-2">
            {STEPS.map((label, i) => (
              <span
                key={i}
                className={`text-xs font-gothic transition-colors ${
                  i + 1 === currentStep ? "text-blood" :
                  i + 1 < currentStep  ? "text-gray-500" : "text-gray-700"
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
