import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMinutes } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SpeakerSelector } from './SpeakerSelector';
import { AGENDA_ITEM_TYPES, getAgendaTypeConfig } from './AgendaTypeIcon';
import type { AgendaItem, AgendaItemType, SpeakerAssignment } from '@/hooks/useAgendaItems';
import type { Speaker } from '@/hooks/useSpeakers';
import { cn } from '@/lib/utils';

const agendaItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  item_type: z.string(),
  date: z.date(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  location: z.string().optional(),
  track: z.string().optional(),
  is_highlighted: z.boolean(),
});

type AgendaItemFormData = z.infer<typeof agendaItemSchema>;

interface AgendaItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AgendaItem | null;
  defaultDateTime?: Date | null;
  eventId: string;
  speakers: Speaker[];
  existingTracks: string[];
  onSubmit: (data: {
    title: string;
    description: string | null;
    item_type: AgendaItemType;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    track: string | null;
    is_highlighted: boolean;
    event_id: string;
    sort_order: number;
  }, speakerAssignments: SpeakerAssignment[]) => Promise<void>;
  isLoading?: boolean;
}

export function AgendaItemForm({
  open,
  onOpenChange,
  item,
  defaultDateTime,
  eventId,
  speakers,
  existingTracks,
  onSubmit,
  isLoading,
}: AgendaItemFormProps) {
  const [selectedSpeakers, setSelectedSpeakers] = useState<SpeakerAssignment[]>([]);

  const getDefaultDate = () => {
    if (item?.starts_at) {
      return new Date(item.starts_at);
    }
    if (defaultDateTime) {
      return defaultDateTime;
    }
    return new Date();
  };

  const getDefaultStartTime = () => {
    if (item?.starts_at) {
      return format(new Date(item.starts_at), 'HH:mm');
    }
    if (defaultDateTime) {
      return format(defaultDateTime, 'HH:mm');
    }
    return '09:00';
  };

  const getDefaultEndTime = () => {
    if (item?.ends_at) {
      return format(new Date(item.ends_at), 'HH:mm');
    }
    if (defaultDateTime) {
      return format(addMinutes(defaultDateTime, 30), 'HH:mm');
    }
    return '';
  };

  const form = useForm<AgendaItemFormData>({
    resolver: zodResolver(agendaItemSchema),
    defaultValues: {
      title: item?.title || '',
      description: item?.description || '',
      item_type: item?.item_type || 'session',
      date: getDefaultDate(),
      start_time: getDefaultStartTime(),
      end_time: getDefaultEndTime(),
      location: item?.location || '',
      track: item?.track || '',
      is_highlighted: item?.is_highlighted || false,
    },
  });

  // Reset form when item or defaultDateTime changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: item?.title || '',
        description: item?.description || '',
        item_type: item?.item_type || 'session',
        date: getDefaultDate(),
        start_time: getDefaultStartTime(),
        end_time: getDefaultEndTime(),
        location: item?.location || '',
        track: item?.track || '',
        is_highlighted: item?.is_highlighted || false,
      });
      
      // Set existing speaker assignments
      if (item?.speakers) {
        setSelectedSpeakers(
          item.speakers.map(s => ({
            speaker_id: s.speaker_id,
            role: s.role,
          }))
        );
      } else {
        setSelectedSpeakers([]);
      }
    }
  }, [open, item, defaultDateTime]);

  const itemType = form.watch('item_type');
  const isSession = itemType === 'session';

  const handleSubmit = async (data: AgendaItemFormData) => {
    const date = data.date;
    const [startHour, startMin] = data.start_time.split(':').map(Number);
    
    const startsAt = new Date(date);
    startsAt.setHours(startHour, startMin, 0, 0);

    let endsAt: Date | null = null;
    if (data.end_time) {
      const [endHour, endMin] = data.end_time.split(':').map(Number);
      endsAt = new Date(date);
      endsAt.setHours(endHour, endMin, 0, 0);
    }

    await onSubmit({
      title: data.title,
      description: data.description || null,
      item_type: data.item_type as AgendaItemType,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() || null,
      location: data.location || null,
      track: data.track || null,
      is_highlighted: data.is_highlighted,
      event_id: eventId,
      sort_order: item?.sort_order || 0,
    }, isSession ? selectedSpeakers : []);

    form.reset();
    setSelectedSpeakers([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Agenda Item' : 'Add Agenda Item'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="item_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AGENDA_ITEM_TYPES.map((type) => {
                        const config = getAgendaTypeConfig(type);
                        return (
                          <SelectItem key={type} value={type}>
                            {config.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Opening Keynote" {...field} />
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
                      placeholder="Session description..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'MMM d')
                            ) : (
                              <span>Pick date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location/Room</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Hall" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="track"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Main Stage"
                        list="tracks"
                        {...field}
                      />
                    </FormControl>
                    <datalist id="tracks">
                      {existingTracks.map((track) => (
                        <option key={track} value={track} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_highlighted"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Featured/Keynote</FormLabel>
                    <FormDescription>
                      Highlight this session in the agenda
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Speakers (only for sessions) */}
            {isSession && (
              <div className="space-y-2">
                <Label>Speakers</Label>
                <SpeakerSelector
                  speakers={speakers}
                  selectedSpeakers={selectedSpeakers}
                  onSelectionChange={setSelectedSpeakers}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
