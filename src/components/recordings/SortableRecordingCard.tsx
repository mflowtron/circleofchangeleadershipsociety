import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { RecordingCard, Recording } from './RecordingCard';
import { cn } from '@/lib/utils';

interface SortableRecordingCardProps {
  recording: Recording;
  index: number;
  totalCount: number;
  isReorderMode: boolean;
  canDelete: boolean;
  onSelect: (recording: Recording) => void;
  onDelete: (recordingId: string, e: React.MouseEvent) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SortableRecordingCard({
  recording,
  index,
  totalCount,
  isReorderMode,
  canDelete,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortableRecordingCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recording.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isReorderMode) {
    return (
      <RecordingCard
        recording={recording}
        canDelete={canDelete}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group/sortable',
        isDragging && 'opacity-50 z-50'
      )}
    >
      {/* Drag handle overlay */}
      <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
        <button
          {...attributes}
          {...listeners}
          className="p-2 rounded-md bg-background/90 backdrop-blur-sm border border-border shadow-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Up/Down buttons overlay */}
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm border border-border shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={index === 0}
          aria-label="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm border border-border shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={index === totalCount - 1}
          aria-label="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Card with click disabled in reorder mode */}
      <div className="pointer-events-none">
        <RecordingCard
          recording={recording}
          canDelete={false}
          onSelect={() => {}}
          onDelete={() => {}}
        />
      </div>

      {/* Reorder mode indicator */}
      <div className="absolute inset-0 rounded-lg ring-2 ring-primary/30 pointer-events-none" />
    </div>
  );
}
