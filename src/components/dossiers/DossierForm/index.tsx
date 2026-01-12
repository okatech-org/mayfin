import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Building2, User, Wallet, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Step1InfoEntreprise } from './Step1InfoEntreprise';
import { Step2Dirigeant } from './Step2Dirigeant';
import { Step3Financement } from './Step3Financement';
import { Step4Comptable } from './Step4Comptable';
import { Step5Documents } from './Step5Documents';

const steps = [
  { id: 1, name: 'Entreprise', icon: Building2 },
  { id: 2, name: 'Dirigeant', icon: User },
  { id: 3, name: 'Financement', icon: Wallet },
  { id: 4, name: 'Comptabilité', icon: FileText },
  { id: 5, name: 'Documents', icon: Upload },
];

export function DossierForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const updateFormData = (data: Record<string, any>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // Here we would save to the database
    navigate('/dossiers');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Steps indicator */}
      <nav className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-all',
                  step.id === currentStep && 'bg-primary/10',
                  step.id < currentStep && 'cursor-pointer hover:bg-muted',
                  step.id > currentStep && 'cursor-default opacity-50'
                )}
                disabled={step.id > currentStep}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                    step.id === currentStep && 'border-primary bg-primary text-primary-foreground',
                    step.id < currentStep && 'border-primary bg-primary text-primary-foreground',
                    step.id > currentStep && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden md:block',
                    step.id === currentStep && 'text-primary',
                    step.id < currentStep && 'text-foreground',
                    step.id > currentStep && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-5 w-5 text-muted-foreground mx-2" />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Form content */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        {currentStep === 1 && (
          <Step1InfoEntreprise data={formData} onUpdate={updateFormData} />
        )}
        {currentStep === 2 && (
          <Step2Dirigeant data={formData} onUpdate={updateFormData} />
        )}
        {currentStep === 3 && (
          <Step3Financement data={formData} onUpdate={updateFormData} />
        )}
        {currentStep === 4 && (
          <Step4Comptable data={formData} onUpdate={updateFormData} />
        )}
        {currentStep === 5 && (
          <Step5Documents data={formData} onUpdate={updateFormData} />
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Précédent
          </Button>
          
          {currentStep < steps.length ? (
            <Button onClick={nextStep}>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
              Créer le dossier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
