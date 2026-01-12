import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  File,
  FileSpreadsheet,
  FileImage,
  Loader2,
  X
} from 'lucide-react';
import type { DocumentRow } from '@/hooks/useDossiers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

const documentTypes = Object.entries(typeLabels).map(([value, { label }]) => ({
  value,
  label,
}));

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, year }: { file: File; type: string; year?: number }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${dossierId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          dossier_id: dossierId,
          type_document: type,
          nom_fichier: file.name,
          chemin_fichier: filePath,
          taille_octets: file.size,
          mime_type: file.type,
          annee_exercice: year || null,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', dossierId] });
      toast.success('Document uploadé avec succès');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setSelectedType('');
      setSelectedYear('');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'upload: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: DocumentRow) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.chemin_fichier]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', dossierId] });
      toast.success('Document supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });

  const handleDownload = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(doc.chemin_fichier);

    if (error) {
      toast.error('Erreur lors du téléchargement');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nom_fichier;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedType) {
      toast.error('Veuillez sélectionner un fichier et un type');
      return;
    }
    uploadMutation.mutate({
      file: selectedFile,
      type: selectedType,
      year: selectedYear ? parseInt(selectedYear) : undefined,
    });
  };

  const needsYear = ['bilan', 'compte_resultat', 'liasse_fiscale'].includes(selectedType);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documents ({documents.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
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
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(doc)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier (max 10 Mo) et choisissez son type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File input */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez pour sélectionner un fichier
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel, Images (max 10 Mo)
                  </p>
                </>
              )}
            </div>

            {/* Type select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de document *</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year select (conditional) */}
            {needsYear && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Année d'exercice *</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez l'année" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !selectedType || (needsYear && !selectedYear) || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
