import { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
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
import { HotelCard } from '@/components/events/hotels/HotelCard';
import { HotelForm } from '@/components/events/hotels/HotelForm';
import { useEventHotels, type EventHotel, type HotelInsert, type HotelUpdate } from '@/hooks/useEventHotels';
import { useEventSelection } from '@/contexts/EventSelectionContext';

export default function Hotels() {
  const { selectedEventId } = useEventSelection();
  const eventId = selectedEventId;

  const { 
    hotels, 
    isLoading, 
    createHotel, 
    updateHotel, 
    deleteHotel,
    uploadImage 
  } = useEventHotels(eventId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<EventHotel | null>(null);
  const [deletingHotel, setDeletingHotel] = useState<EventHotel | null>(null);

  const handleAddHotel = () => {
    setEditingHotel(null);
    setFormOpen(true);
  };

  const handleEditHotel = (hotel: EventHotel) => {
    setEditingHotel(hotel);
    setFormOpen(true);
  };

  const handleDeleteHotel = async () => {
    if (deletingHotel) {
      await deleteHotel.mutateAsync(deletingHotel.id);
      setDeletingHotel(null);
    }
  };

  const handleSubmit = async (data: HotelInsert | HotelUpdate, image?: File) => {
    if (editingHotel) {
      // Update existing hotel
      let imageUrl = editingHotel.image_url;
      if (image) {
        imageUrl = await uploadImage(image, editingHotel.id);
      }
      await updateHotel.mutateAsync({
        id: editingHotel.id,
        ...(data as HotelUpdate),
        image_url: imageUrl,
      });
    } else {
      // Create new hotel
      const result = await createHotel.mutateAsync(data as HotelInsert);
      if (image && result) {
        const imageUrl = await uploadImage(image, result.id);
        await updateHotel.mutateAsync({
          id: result.id,
          image_url: imageUrl,
        });
      }
    }
  };

  if (!eventId) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No event selected</h2>
        <p className="text-muted-foreground">
          Please select an event from the dropdown to manage hotels.
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
            <div key={i} className="h-64 bg-muted rounded" />
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
          <h1 className="text-2xl font-bold">Hotels</h1>
          <p className="text-muted-foreground">
            {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} added
          </p>
        </div>
        <Button onClick={handleAddHotel}>
          <Plus className="h-4 w-4 mr-2" />
          Add Hotel
        </Button>
      </div>

      {/* Hotels grid */}
      {hotels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No hotels yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add hotel options for your event attendees.
            </p>
            <Button onClick={handleAddHotel}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Hotel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onEdit={handleEditHotel}
              onDelete={setDeletingHotel}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <HotelForm
        open={formOpen}
        onOpenChange={setFormOpen}
        hotel={editingHotel}
        eventId={eventId}
        onSubmit={handleSubmit}
        isLoading={createHotel.isPending || updateHotel.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingHotel} onOpenChange={() => setDeletingHotel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hotel?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingHotel?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHotel}
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
