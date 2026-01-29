import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SpeakerCard } from '@/components/events/agenda/SpeakerCard';
import { SpeakerForm } from '@/components/events/agenda/SpeakerForm';
import { useSpeakers, type Speaker, type SpeakerInsert, type SpeakerUpdate } from '@/hooks/useSpeakers';
import { useEventSelection } from '@/contexts/EventSelectionContext';

export default function Speakers() {
  const { id } = useParams<{ id: string }>();
  const { selectedEventId } = useEventSelection();
  const eventId = id || selectedEventId;

  const { 
    speakers, 
    isLoading, 
    createSpeaker, 
    updateSpeaker, 
    deleteSpeaker,
    uploadPhoto 
  } = useSpeakers(eventId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [deletingSpeaker, setDeletingSpeaker] = useState<Speaker | null>(null);

  const handleAddSpeaker = () => {
    setEditingSpeaker(null);
    setFormOpen(true);
  };

  const handleEditSpeaker = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setFormOpen(true);
  };

  const handleDeleteSpeaker = async () => {
    if (deletingSpeaker) {
      await deleteSpeaker.mutateAsync(deletingSpeaker.id);
      setDeletingSpeaker(null);
    }
  };

  const handleSubmit = async (data: SpeakerInsert | SpeakerUpdate, photo?: File) => {
    if (editingSpeaker) {
      // Update existing speaker
      let photoUrl = editingSpeaker.photo_url;
      if (photo) {
        photoUrl = await uploadPhoto(photo, editingSpeaker.id);
      }
      await updateSpeaker.mutateAsync({
        id: editingSpeaker.id,
        ...(data as SpeakerUpdate),
        photo_url: photoUrl,
      });
    } else {
      // Create new speaker
      const result = await createSpeaker.mutateAsync(data as SpeakerInsert);
      if (photo && result) {
        const photoUrl = await uploadPhoto(photo, result.id);
        await updateSpeaker.mutateAsync({
          id: result.id,
          photo_url: photoUrl,
        });
      }
    }
  };

  if (!eventId) {
    return (
      <div className="text-center py-12">
        <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No event selected</h2>
        <p className="text-muted-foreground">
          Please select an event from the dropdown to manage speakers.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Speakers</h1>
          <p className="text-muted-foreground">
            {speakers.length} speaker{speakers.length !== 1 ? 's' : ''} added
          </p>
        </div>
        <Button onClick={handleAddSpeaker}>
          <Plus className="h-4 w-4 mr-2" />
          Add Speaker
        </Button>
      </div>

      {/* Speakers grid */}
      {speakers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No speakers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add speakers to feature them in your event agenda sessions.
            </p>
            <Button onClick={handleAddSpeaker}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Speaker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {speakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              onEdit={handleEditSpeaker}
              onDelete={setDeletingSpeaker}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <SpeakerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        speaker={editingSpeaker}
        eventId={eventId}
        onSubmit={handleSubmit}
        isLoading={createSpeaker.isPending || updateSpeaker.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingSpeaker} onOpenChange={() => setDeletingSpeaker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete speaker?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSpeaker?.name}"? This will also remove them from any agenda sessions they're assigned to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSpeaker}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
