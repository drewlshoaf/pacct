'use client';

import { WIZARD_STEPS } from '../wizard-state';

interface WizardShellProps {
  currentStep: number;
  stepValidation: Record<number, boolean>;
  onBack: () => void;
  onNext: () => void;
  onStepClick: (step: number) => void;
  isLastStep: boolean;
  isFirstStep: boolean;
  canProceed: boolean;
  onCreateClick?: () => void;
  creating?: boolean;
  children: React.ReactNode;
}

export default function WizardShell({
  currentStep,
  stepValidation,
  onBack,
  onNext,
  onStepClick,
  isLastStep,
  isFirstStep,
  canProceed,
  onCreateClick,
  creating,
  children,
}: WizardShellProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create New Network</h1>

      {/* Step indicator */}
      <nav className="mb-8">
        <ol className="flex items-center gap-2 overflow-x-auto">
          {WIZARD_STEPS.map((step) => {
            const isActive = step.index === currentStep;
            const isCompleted = stepValidation[step.index] === true;
            const isPast = step.index < currentStep;

            let bgClass = 'bg-gray-100 text-gray-600';
            if (isActive) bgClass = 'bg-blue-600 text-white';
            else if (isCompleted) bgClass = 'bg-green-100 text-green-800';
            else if (isPast) bgClass = 'bg-blue-100 text-blue-800';

            return (
              <li key={step.index} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStepClick(step.index)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${bgClass} hover:opacity-80 transition-opacity`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                    {isCompleted ? '\u2713' : step.index + 1}
                  </span>
                  {step.label}
                </button>
                {step.index < WIZARD_STEPS.length - 1 && (
                  <span className="text-gray-300">/</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div className="bg-white border rounded-lg p-6 mb-6 min-h-[400px]">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep}
          className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex gap-3">
          {isLastStep ? (
            <button
              type="button"
              onClick={onCreateClick}
              disabled={!canProceed || creating}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {creating ? 'Creating...' : 'Create Network'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
