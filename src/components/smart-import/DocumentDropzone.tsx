import { useCallback, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet, Image, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DocumentDropzoneProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    disabled?: boolean;
    maxFiles?: number;
    maxSizeMB?: number;
}

const ACCEPTED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
    'application/pdf': FileText,
    'image/jpeg': Image,
    'image/png': Image,
    'image/webp': Image,
    'application/vnd.ms-excel': FileSpreadsheet,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
};

const DOCUMENT_LABELS: Record<string, string> = {
    'kbis': 'Kbis',
    'bilan': 'Bilan',
    'liasse': 'Liasse fiscale',
    'statut': 'Statuts',
    'identite': 'Pièce d\'identité',
    'cni': 'CNI',
    'passeport': 'Passeport',
    'rib': 'RIB',
};

function detectDocumentType(filename: string): string | null {
    const lower = filename.toLowerCase();
    for (const [key, label] of Object.entries(DOCUMENT_LABELS)) {
        if (lower.includes(key)) return label;
    }
    return null;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDropzone({
    files,
    onFilesChange,
    disabled = false,
    maxFiles = 10,
    maxSizeMB = 20,
}: DocumentDropzoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            if (disabled) return;

            const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
                if (!ACCEPTED_TYPES.includes(file.type)) return false;
                if (file.size > maxSizeMB * 1024 * 1024) return false;
                return true;
            });

            const newFiles = [...files, ...droppedFiles].slice(0, maxFiles);
            onFilesChange(newFiles);
        },
        [files, onFilesChange, disabled, maxFiles, maxSizeMB]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || disabled) return;

            const selectedFiles = Array.from(e.target.files).filter((file) => {
                if (!ACCEPTED_TYPES.includes(file.type)) return false;
                if (file.size > maxSizeMB * 1024 * 1024) return false;
                return true;
            });

            const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
            onFilesChange(newFiles);
            e.target.value = '';
        },
        [files, onFilesChange, disabled, maxFiles, maxSizeMB]
    );

    const removeFile = useCallback(
        (index: number) => {
            const newFiles = files.filter((_, i) => i !== index);
            onFilesChange(newFiles);
        },
        [files, onFilesChange]
    );

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                    'relative rounded-xl border-2 border-dashed transition-all duration-200',
                    'flex flex-col items-center justify-center p-8 text-center',
                    isDragOver && !disabled && 'border-primary bg-primary/5 scale-[1.01]',
                    !isDragOver && !disabled && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                    disabled && 'opacity-50 cursor-not-allowed bg-muted/30'
                )}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
                        isDragOver ? 'bg-primary/20' : 'bg-muted'
                    )}>
                        <Upload className={cn(
                            'h-7 w-7 transition-colors',
                            isDragOver ? 'text-primary' : 'text-muted-foreground'
                        )} />
                    </div>
                    <div className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
                        isDragOver ? 'bg-primary/20' : 'bg-muted'
                    )}>
                        <Camera className={cn(
                            'h-7 w-7 transition-colors',
                            isDragOver ? 'text-primary' : 'text-muted-foreground'
                        )} />
                    </div>
                </div>

                <p className="text-lg font-medium text-foreground mb-1">
                    {isDragOver ? 'Déposez vos documents ici' : 'Glissez vos documents ici'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                    ou sélectionnez des fichiers
                </p>

                {/* Buttons for file selection and camera */}
                <div className="flex flex-wrap justify-center gap-3 mb-4 relative z-10">
                    <label 
                        htmlFor="file-input-btn"
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer",
                            "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
                            (disabled || files.length >= maxFiles) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Upload className="h-4 w-4" />
                        Sélectionner des fichiers
                    </label>
                    <input
                        id="file-input-btn"
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES.join(',')}
                        onChange={handleFileSelect}
                        disabled={disabled || files.length >= maxFiles}
                        className="hidden"
                    />
                    
                    <label 
                        htmlFor="camera-input"
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer",
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            (disabled || files.length >= maxFiles) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Camera className="h-4 w-4" />
                        Prendre une photo
                    </label>
                    <input
                        id="camera-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        disabled={disabled || files.length >= maxFiles}
                        className="hidden"
                    />
                </div>

                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">JPG / PNG</Badge>
                    <Badge variant="outline">Excel</Badge>
                    <span className="text-muted-foreground/50">•</span>
                    <span>Max {maxSizeMB}MB par fichier</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>Max {maxFiles} fichiers</span>
                </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                        {files.length} document{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
                    </p>
                    <div className="grid gap-2">
                        {files.map((file, index) => {
                            const IconComponent = FILE_TYPE_ICONS[file.type] || FileText;
                            const detectedType = detectDocumentType(file.name);

                            return (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <IconComponent className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    {detectedType && (
                                        <Badge variant="secondary" className="shrink-0">
                                            {detectedType}
                                        </Badge>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 h-8 w-8"
                                        onClick={() => removeFile(index)}
                                        disabled={disabled}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
