import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EventHotel, HotelInsert, HotelUpdate } from '@/hooks/useEventHotels';

const hotelSchema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional(),
  description: z.string().optional(),
  rate_description: z.string().optional(),
  booking_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type HotelFormData = z.infer<typeof hotelSchema>;

interface HotelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel?: EventHotel | null;
  eventId: string;
  onSubmit: (data: HotelInsert | HotelUpdate, image?: File) => Promise<void>;
  isLoading?: boolean;
}

export function HotelForm({
  open,
  onOpenChange,
  hotel,
  eventId,
  onSubmit,
  isLoading,
}: HotelFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      description: '',
      rate_description: '',
      booking_url: '',
    },
  });

  // Reset form when hotel changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: hotel?.name || '',
        address: hotel?.address || '',
        phone: hotel?.phone || '',
        description: hotel?.description || '',
        rate_description: hotel?.rate_description || '',
        booking_url: hotel?.booking_url || '',
      });
      setImagePreview(hotel?.image_url || null);
      setImageFile(null);
    }
  }, [open, hotel, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (data: HotelFormData) => {
    const formData = {
      ...data,
      event_id: eventId,
      sort_order: hotel?.sort_order || 0,
      phone: data.phone || null,
      description: data.description || null,
      rate_description: data.rate_description || null,
      booking_url: data.booking_url || null,
    };

    await onSubmit(formData as HotelInsert, imageFile || undefined);
    form.reset();
    setImageFile(null);
    setImagePreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hotel ? 'Edit Hotel' : 'Add Hotel'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <FormLabel>Hotel Image</FormLabel>
              <div className="flex items-start gap-4">
                <div className="relative w-32 h-20 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <>
                      <img 
                        src={imagePreview} 
                        alt="Hotel preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 800x450px
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Marriott Hotel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="555-123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Hotel amenities and location details..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate Description</FormLabel>
                  <FormControl>
                    <Input placeholder="$199.00 per night" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="booking_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://hotel.com/book" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : hotel ? 'Save Changes' : 'Add Hotel'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
