import { useState } from 'react';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Step5Props {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  bloquant: boolean;
}

const documentTypes: DocumentType[] = [
  { id: 'kbis', name: 'Kbis', description: 'Extrait Kbis de moins de 3 mois', required: true, bloquant: true },
  { id: 'statuts', name: 'Statuts', description: 'Statuts à jour signés', required: true, bloquant: false },
  { id: 'piece_identite', name: 'Pièce d\'identité', description: 'CNI ou passeport du dirigeant', required: true, bloquant: true },
  { id: 'justif_domicile', name: 'Justificatif de domicile', description: 'Moins de 3 mois', required: true, bloquant: false },
  { id: 'bilan_n1', name: 'Bilan N-1', description: 'Dernier bilan certifié', required: true, bloquant: true },
  { id: 'bilan_n2', name: 'Bilan N-2', description: 'Bilan année précédente', required: true, bloquant: true },
  { id: 'bilan_n3', name: 'Bilan N-3', description: 'Bilan 2 ans avant', required: false, bloquant: false },
  { id: 'compte_resultat', name: 'Comptes de résultat', description: '3 derniers exercices', required: true, bloquant: true },
  { id: 'liasse_fiscale', name: 'Liasse fiscale', description: 'Dernière liasse fiscale complète', required: true, bloquant: false },
  { id: 'previsionnel', name: 'Prévisionnel', description: 'Business plan ou prévisionnel', required: false, bloquant: false },
  { id: 'beneficiaires_effectifs', name: 'Bénéficiaires effectifs', description: 'Déclaration des bénéficiaires', required: true, bloquant: false },
  { id: 'devis', name: 'Devis fournisseur', description: 'Devis du bien à financer', required: false, bloquant: false },
];

export function Step5Documents({ data, onUpdate }: Step5Props) {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>(
    data.documents || {}
  );

  const handleFileChange = (docId: string, file: File | null) => {
    const newFiles = { ...uploadedFiles, [docId]: file };
    setUploadedFiles(newFiles);
    onUpdate({ documents: newFiles });
  };

  const getDocumentStatus = (docId: string, doc: DocumentType) => {
    if (uploadedFiles[docId]) return 'uploaded';
    if (doc.bloquant) return 'missing-blocking';
    if (doc.required) return 'missing-required';
    return 'optional';
  };

  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const requiredCount = documentTypes.filter(d => d.required).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Documents justificatifs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Téléversez les documents requis pour l'analyse du dossier
        </p>
      </div>

      {/* Progress */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progression</span>
          <span className="text-sm text-muted-foreground">{uploadedCount} / {documentTypes.length} documents</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(uploadedCount / documentTypes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Bloquant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-warning" />
          <span className="text-muted-foreground">Requis</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Optionnel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success" />
          <span className="text-muted-foreground">Téléversé</span>
        </div>
      </div>

      {/* Document list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentTypes.map((doc) => {
          const status = getDocumentStatus(doc.id, doc);
          const file = uploadedFiles[doc.id];

          return (
            <div
              key={doc.id}
              className={cn(
                'relative p-4 rounded-lg border-2 border-dashed transition-colors',
                status === 'uploaded' && 'border-success bg-success/5',
                status === 'missing-blocking' && 'border-destructive/50 bg-destructive/5',
                status === 'missing-required' && 'border-warning/50 bg-warning/5',
                status === 'optional' && 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                  status === 'uploaded' && 'bg-success/20 text-success',
                  status === 'missing-blocking' && 'bg-destructive/20 text-destructive',
                  status === 'missing-required' && 'bg-warning/20 text-warning',
                  status === 'optional' && 'bg-muted text-muted-foreground'
                )}>
                  {status === 'uploaded' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{doc.name}</p>
                    {doc.bloquant && (
                      <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                        BLOQUANT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                  
                  {file ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-success truncate">{file.name}</span>
                      <button
                        onClick={() => handleFileChange(doc.id, null)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="block mt-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                        onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Téléverser
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning if blocking documents missing */}
      {documentTypes.some(d => d.bloquant && !uploadedFiles[d.id]) && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Documents bloquants manquants</p>
            <p className="text-sm text-muted-foreground mt-1">
              Certains documents obligatoires ne sont pas encore téléversés. Le dossier ne pourra pas être validé sans ces pièces.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
