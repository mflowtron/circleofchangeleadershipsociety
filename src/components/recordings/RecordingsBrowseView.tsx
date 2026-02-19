import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { RecordingCard, Recording } from './RecordingCard';
import { SortableRecordingCard } from './SortableRecordingCard';

interface RecordingsBrowseViewProps {
  recordings: Recording[];
  canDelete: boolean;
  isReorderMode: boolean;
  watchProgressMap?: Record<string, { position_seconds: number; duration_seconds: number }>;
  onSelect: (recording: Recording) => void;
  onDelete: (recordingId: string, e: React.MouseEvent) => void;
  onReorder: (activeId: string, overId: string) => void;
  onMoveByIndex: (fromIndex: number, toIndex: number) => void;
}

export function RecordingsBrowseView({
  recordings,
  canDelete,
  isReorderMode,
  watchProgressMap,
  onSelect,
  onDelete,
  onReorder,
  onMoveByIndex,
}: RecordingsBrowseViewProps) {
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
      onReorder(active.id as string, over.id as string);
    }
  };

  if (recordings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recordings available yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (isReorderMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={recordings.map((r) => r.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 p-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            {recordings.map((recording, index) => (
              <SortableRecordingCard
                key={recording.id}
                recording={recording}
                index={index}
                totalCount={recordings.length}
                isReorderMode={isReorderMode}
                canDelete={canDelete}
                onSelect={onSelect}
                onDelete={onDelete}
                onMoveUp={() => onMoveByIndex(index, index - 1)}
                onMoveDown={() => onMoveByIndex(index, index + 1)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
      {recordings.map((recording) => {
        const wp = watchProgressMap?.[recording.id];
        const pct = wp && wp.duration_seconds > 0
          ? Math.min(100, Math.round((wp.position_seconds / wp.duration_seconds) * 100))
          : undefined;
        return (
          <RecordingCard
            key={recording.id}
            recording={recording}
            canDelete={canDelete}
            watchProgress={pct}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
