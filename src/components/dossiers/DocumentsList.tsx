import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  File,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import type { DocumentRow } from '@/hooks/useDossiers';
import { cn } from '@/lib/utils';

interface DocumentsListProps {
  dossierId: string;
  documents: DocumentRow[];
}

const typeLabels: Record<string, { label: string; color: string }> = {
  kbis: { label: 'Kbis', color: 'bg-blue-500' },
  bilan: { label: 'Bilan', color: 'bg-green-500' },
  compte_resultat: { label: 'Compte résultat', color: 'bg-green-500' },
  liasse_fiscale: { label: 'Liasse fiscale', color: 'bg-green-500' },
  previsionnel: { label: 'Prévisionnel', color: 'bg-purple-500' },
  statuts: { label: 'Statuts', color: 'bg-gray-500' },
  piece_identite: { label: 'Pièce identité', color: 'bg-orange-500' },
  justif_domicile: { label: 'Justificatif domicile', color: 'bg-orange-500' },
  beneficiaires_effectifs: { label: 'Bénéficiaires effectifs', color: 'bg-orange-500' },
  jugement: { label: 'Jugement', color: 'bg-red-500' },
  plan_continuation: { label: 'Plan continuation', color: 'bg-red-500' },
  rapport_administrateur: { label: 'Rapport administrateur', color: 'bg-red-500' },
  devis: { label: 'Devis', color: 'bg-cyan-500' },
  autre: { label: 'Autre', color: 'bg-gray-400' },
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  }
  if (mimeType.includes('image')) {
    return <FileImage className="h-8 w-8 text-blue-600" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-8 w-8 text-red-600" />;
  }
  return <File className="h-8 w-8 text-gray-600" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentsList({ dossierId, documents }: DocumentsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents ({documents.length})
        </CardTitle>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Aucun document uploadé</p>
            <p className="text-sm">Cliquez sur "Ajouter" pour uploader des documents</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const typeInfo = typeLabels[doc.type_document] || typeLabels.autre;
              
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getFileIcon(doc.mime_type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{doc.nom_fichier}</p>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-white text-xs", typeInfo.color)}
                      >
                        {typeInfo.label}
                      </Badge>
                      {doc.annee_exercice && (
                        <Badge variant="outline" className="text-xs">
                          {doc.annee_exercice}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatFileSize(doc.taille_octets)}</span>
                      <span>•</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
