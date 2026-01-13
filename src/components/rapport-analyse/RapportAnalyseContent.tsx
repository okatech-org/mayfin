import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Loader2,
    Save,
    CheckCircle,
    XCircle,
    Download,
    FileText,
    Building2,
    User,
    TrendingUp,
    Euro,
    Shield,
    MessageSquare,
    ClipboardCheck,
    Target
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { QuestionnaireSection } from './QuestionnaireSection';
import { SyntheseSection } from './SyntheseSection';
import {
    useRapportAnalyse,
    useCreateRapport,
    useUpdateRapport,
    useFinalizeRapport,
    calculateCompletion,
    type RapportAnalyseRow
} from '@/hooks/useRapportAnalyse';
import { SECTIONS, getQuestionsForSection } from '@/data/questionnaire-structure';
import { generateRapportPDF } from '@/lib/rapport-pdf-generator';
import type { DossierRow } from '@/hooks/useDossiers';

interface RapportAnalyseContentProps {
    dossierId: string;
    dossier: DossierRow;
}

// Section icons mapping
const sectionIcons: Record<string, React.ReactNode> = {
    projet: <FileText className="h-4 w-4" />,
    porteur_projet: <User className="h-4 w-4" />,
    cession: <Building2 className="h-4 w-4" />,
    analyse_financiere: <TrendingUp className="h-4 w-4" />,
    previsionnel: <Euro className="h-4 w-4" />,
    endettement: <Shield className="h-4 w-4" />,
    commentaires_previsionnel: <MessageSquare className="h-4 w-4" />,
    controles: <ClipboardCheck className="h-4 w-4" />,
    synthese: <Target className="h-4 w-4" />
};

export const RapportAnalyseContent: React.FC<RapportAnalyseContentProps> = ({
    dossierId,
    dossier
}) => {
    const [activeSection, setActiveSection] = useState(SECTIONS[0].code);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [localValues, setLocalValues] = useState<Partial<RapportAnalyseRow>>({});
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    // Queries and mutations
    const { data: rapport, isLoading: loadingRapport } = useRapportAnalyse(dossierId);
    const createRapport = useCreateRapport();
    const updateRapport = useUpdateRapport();
    const finalizeRapport = useFinalizeRapport();

    // Sync local values with fetched data
    useEffect(() => {
        if (rapport) {
            setLocalValues(rapport);
        }
    }, [rapport]);

    // Combined values (local takes precedence for responsiveness)
    const currentValues = { ...rapport, ...localValues } as RapportAnalyseRow;

    // Calculate completion
    const completion = rapport ? calculateCompletion(currentValues) : 0;
    const isFinalized = rapport?.statut === 'finalise' || rapport?.statut === 'valide';

    // Auto-save handler with debounce
    const handleFieldChange = useCallback((field: string, value: unknown) => {
        if (isFinalized) return;

        // Update local state immediately for responsiveness
        setLocalValues(prev => ({ ...prev, [field]: value }));

        // Clear previous timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Set auto-save status
        setAutoSaveStatus('saving');

        // Debounce the actual save
        debounceTimeout.current = setTimeout(async () => {
            if (rapport?.id) {
                try {
                    await updateRapport.mutateAsync({
                        id: rapport.id,
                        [field]: value
                    });
                    setAutoSaveStatus('saved');

                    // Reset to idle after 2 seconds
                    setTimeout(() => setAutoSaveStatus('idle'), 2000);
                } catch {
                    setAutoSaveStatus('error');
                }
            }
        }, 1500); // 1.5 second debounce
    }, [rapport?.id, updateRapport, isFinalized]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    // Create rapport if doesn't exist
    const handleCreateRapport = async () => {
        await createRapport.mutateAsync(dossierId);
    };

    // Finalize rapport
    const handleFinalize = async () => {
        if (rapport?.id) {
            await finalizeRapport.mutateAsync({ id: rapport.id, dossierId });
        }
    };

    // Generate PDF
    const handleDownloadPDF = async () => {
        if (rapport && dossier) {
            try {
                await generateRapportPDF(currentValues, dossier);
            } catch (error) {
                console.error('Error generating PDF:', error);
            }
        }
    };

    // Loading state
    if (loadingRapport) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // No rapport exists - show create button
    if (!rapport) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Aucun rapport d'analyse</h3>
                <p className="text-muted-foreground text-center max-w-md">
                    Créez un rapport d'analyse pour évaluer ce dossier de financement
                    à travers un questionnaire structuré.
                </p>
                <Button onClick={handleCreateRapport} disabled={createRapport.isPending}>
                    {createRapport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Créer le rapport d'analyse
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with progress and actions */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Status badges */}
                <Badge variant={isFinalized ? 'default' : 'secondary'}>
                    {isFinalized ? 'Finalisé' : 'Brouillon'}
                </Badge>

                {/* Auto-save indicator */}
                <div className="text-sm flex items-center gap-1">
                    {autoSaveStatus === 'saving' && (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
                            <span className="text-yellow-600">Enregistrement...</span>
                        </>
                    )}
                    {autoSaveStatus === 'saved' && (
                        <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600">Enregistré</span>
                        </>
                    )}
                    {autoSaveStatus === 'error' && (
                        <>
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span className="text-red-600">Erreur</span>
                        </>
                    )}
                </div>

                <div className="flex-1" />

                {/* Action buttons */}
                {isFinalized && (
                    <Button variant="outline" onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger PDF
                    </Button>
                )}

                {!isFinalized && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={completion < 100 || finalizeRapport.isPending}>
                                {finalizeRapport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                <Save className="h-4 w-4 mr-2" />
                                Finaliser le rapport
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Finaliser le rapport ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Une fois finalisé, le rapport ne pourra plus être modifié.
                                    Vous pourrez télécharger le PDF pour validation hiérarchique.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFinalize}>
                                    Confirmer la finalisation
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progression du questionnaire</span>
                    <span className="font-medium">{completion}%</span>
                </div>
                <Progress value={completion} className="h-2" />
            </div>

            {/* Alert if not complete */}
            {!isFinalized && completion < 100 && (
                <Alert>
                    <AlertDescription>
                        Complétez toutes les questions obligatoires pour pouvoir finaliser le rapport.
                    </AlertDescription>
                </Alert>
            )}

            {/* Tabs for sections */}
            <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                    {SECTIONS.map(section => (
                        <TabsTrigger
                            key={section.code}
                            value={section.code}
                            className="flex items-center gap-1.5 text-xs px-2 py-1.5"
                        >
                            {sectionIcons[section.code]}
                            <span className="hidden md:inline">{section.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {SECTIONS.slice(0, -1).map(section => (
                    <TabsContent key={section.code} value={section.code} className="mt-6">
                        <QuestionnaireSection
                            sectionCode={section.code}
                            questions={getQuestionsForSection(section.code)}
                            values={currentValues}
                            onChange={handleFieldChange}
                            disabled={isFinalized}
                        />
                    </TabsContent>
                ))}

                {/* Synthèse section (special handling) */}
                <TabsContent value="synthese" className="mt-6">
                    <SyntheseSection
                        values={currentValues}
                        onChange={handleFieldChange}
                        disabled={isFinalized}
                        completion={completion}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default RapportAnalyseContent;
