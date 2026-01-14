import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Building2, User, Wallet, FileText, Upload, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Step1InfoEntreprise } from './Step1InfoEntreprise';
import { Step2Dirigeant } from './Step2Dirigeant';
import { Step3Financement } from './Step3Financement';
import { Step4Comptable } from './Step4Comptable';
import { Step5Documents } from './Step5Documents';
import { Step6AnalysisPreview } from './Step6AnalysisPreview';
import { useCreateDossier } from '@/hooks/useDossiers';
import { toast } from 'sonner';
import type { ScoringResult } from '@/types/dossier.types';

const steps = [
  { id: 1, name: 'Entreprise', icon: Building2 },
  { id: 2, name: 'Dirigeant', icon: User },
  { id: 3, name: 'Financement', icon: Wallet },
  { id: 4, name: 'Comptabilité', icon: FileText },
  { id: 5, name: 'Documents', icon: Upload },
  { id: 6, name: 'Analyse', icon: Target },
];

// Map scoring statut to DB recommandation
const STATUT_TO_RECOMMANDATION: Record<ScoringResult['statut'], string> = {
  'accord_favorable': 'FAVORABLE',
  'accord_conditionne': 'RESERVES',
  'etude_approfondie': 'RESERVES',
  'refus': 'DEFAVORABLE',
};

export function DossierForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const createDossier = useCreateDossier();

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

  const handleSubmitWithScore = async (scoringResult: ScoringResult) => {
    try {
      await createDossier.mutateAsync({
        raison_sociale: formData.raison_sociale || 'Entreprise',
        siren: formData.siren || '',
        siret: formData.siret || null,
        forme_juridique: formData.forme_juridique || null,
        date_creation: formData.date_creation || null,
        code_naf: formData.code_naf || null,
        secteur_activite: formData.secteur_activite || null,
        nb_salaries: formData.nb_salaries || null,
        adresse_siege: formData.adresse_siege || null,
        en_procedure: formData.en_procedure || false,
        type_procedure: formData.type_procedure || null,
        date_jugement: formData.date_jugement || null,
        tribunal: formData.tribunal || null,
        dirigeant_civilite: formData.dirigeant_civilite || null,
        dirigeant_nom: formData.dirigeant_nom || '',
        dirigeant_prenom: formData.dirigeant_prenom || '',
        dirigeant_date_naissance: formData.dirigeant_date_naissance || null,
        dirigeant_adresse: formData.dirigeant_adresse || null,
        dirigeant_telephone: formData.dirigeant_telephone || null,
        dirigeant_email: formData.dirigeant_email || null,
        dirigeant_experience: formData.dirigeant_experience || null,
        dirigeant_fiche_ficp: formData.dirigeant_fiche_ficp || null,
        type_financement: formData.type_financement || 'credit_bail',
        montant_demande: formData.montant_demande || 0,
        duree_mois: formData.duree_mois || null,
        objet_financement: formData.objet_financement || null,
        nature_bien: formData.nature_bien || null,
        description_bien: formData.description_bien || null,
        // Score from scoring calculation
        score_global: scoringResult.scoreGlobal,
        recommandation: STATUT_TO_RECOMMANDATION[scoringResult.statut],
        status: 'en_cours',
      });

      toast.success('Dossier créé avec succès');
      navigate('/dossiers');
    } catch (err) {
      console.error('Error creating dossier:', err);
      toast.error('Erreur lors de la création du dossier');
    }
  };

  // Check if we can show step 6 (need minimum data)
  const hasMinimumData = formData.raison_sociale && formData.siren;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Steps indicator */}
      <nav className="mb-8">
        <ol className="flex items-center flex-wrap gap-y-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                className={cn(
                  'flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 rounded-lg transition-all',
                  step.id === currentStep && 'bg-primary/10',
                  step.id < currentStep && 'cursor-pointer hover:bg-muted',
                  step.id > currentStep && 'cursor-default opacity-50'
                )}
                disabled={step.id > currentStep}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full border-2 transition-colors',
                    step.id === currentStep && 'border-primary bg-primary text-primary-foreground',
                    step.id < currentStep && 'border-primary bg-primary text-primary-foreground',
                    step.id > currentStep && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <step.icon className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs md:text-sm font-medium hidden lg:block',
                    step.id === currentStep && 'text-primary',
                    step.id < currentStep && 'text-foreground',
                    step.id > currentStep && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground mx-1 md:mx-2" />
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
        {currentStep === 6 && (
          <Step6AnalysisPreview
            data={formData}
            onUpdate={updateFormData}
            onPrevious={prevStep}
            onSubmit={handleSubmitWithScore}
            isSubmitting={createDossier.isPending}
          />
        )}

        {/* Navigation buttons - hidden on step 6 (has its own) */}
        {currentStep < 6 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Précédent
            </Button>

            <Button onClick={nextStep}>
              {currentStep === 5 ? 'Analyser' : 'Suivant'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
