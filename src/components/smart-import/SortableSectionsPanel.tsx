import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SectionConfig } from './DocumentPreviewModal';

interface SortableSectionItemProps {
    section: SectionConfig;
    onToggle: (id: string, enabled: boolean) => void;
}

function SortableSectionItem({ section, onToggle }: SortableSectionItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = section.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all',
                isDragging && 'shadow-lg ring-2 ring-primary/50 z-50',
                !section.enabled && 'opacity-50 bg-muted/30'
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 hover:bg-muted rounded"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            
            <Checkbox
                id={`sort-${section.id}`}
                checked={section.enabled}
                onCheckedChange={(checked) => onToggle(section.id, !!checked)}
            />
            
            <Icon className={cn('h-4 w-4', section.enabled ? 'text-primary' : 'text-muted-foreground')} />
            
            <Label 
                htmlFor={`sort-${section.id}`} 
                className="flex-1 cursor-pointer text-sm font-medium"
            >
                {section.label}
            </Label>
            
            {section.enabled ? (
                <Eye className="h-4 w-4 text-success" />
            ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
        </div>
    );
}

interface SortableSectionsPanelProps {
    sections: SectionConfig[];
    onSectionsChange: (sections: SectionConfig[]) => void;
    onToggle: (id: string, enabled: boolean) => void;
}

export function SortableSectionsPanel({ 
    sections, 
    onSectionsChange,
    onToggle 
}: SortableSectionsPanelProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((s) => s.id === active.id);
            const newIndex = sections.findIndex((s) => s.id === over.id);
            const newSections = arrayMove(sections, oldIndex, newIndex);
            onSectionsChange(newSections);
        }
    };

    const enabledCount = sections.filter(s => s.enabled).length;

    return (
        <div className="space-y-4">
            {/* Mini PDF Preview */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-muted/50 to-muted/30">
                <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Aperçu du rapport</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                        {enabledCount} section{enabledCount > 1 ? 's' : ''}
                    </Badge>
                </div>
                
                {/* Mini document preview */}
                <div className="bg-background rounded border shadow-sm p-3 space-y-2 max-h-40 overflow-y-auto">
                    {/* Header mock */}
                    <div className="flex items-center justify-between pb-2 border-b">
                        <div className="h-3 w-24 bg-primary/20 rounded" />
                        <div className="h-3 w-12 bg-success/30 rounded" />
                    </div>
                    
                    {/* Section previews in order */}
                    {sections.filter(s => s.enabled).map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <div 
                                key={section.id}
                                className="flex items-center gap-2 p-1.5 rounded bg-muted/30 text-xs"
                            >
                                <span className="text-muted-foreground font-mono w-4">{index + 1}.</span>
                                <Icon className="h-3 w-3 text-primary" />
                                <span className="truncate">{section.label}</span>
                            </div>
                        );
                    })}
                    
                    {enabledCount === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                            Aucune section sélectionnée
                        </p>
                    )}
                </div>
            </div>

            {/* Sortable sections list */}
            <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    Glissez pour réorganiser l'ordre des sections
                </p>
                
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={sections.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {sections.map((section) => (
                                <SortableSectionItem
                                    key={section.id}
                                    section={section}
                                    onToggle={onToggle}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
