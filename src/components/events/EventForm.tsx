import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, MapPin, FileText, Image, Link as LinkIcon, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COMMON_TIMEZONES, getTimezoneAbbreviation } from '@/lib/timezoneUtils';
import type { Event, CreateEventData, UpdateEventData } from '@/hooks/useEvents';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: CreateEventData | UpdateEventData) => Promise<Event>;
  isSubmitting: boolean;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function EventForm({ event, onSubmit, isSubmitting }: EventFormProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setSlug(event.slug);
      setSlugTouched(true);
      setShortDescription(event.short_description || '');
      setDescription(event.description || '');
      setVenueName(event.venue_name || '');
      setVenueAddress(event.venue_address || '');
      setStartsAt(event.starts_at ? format(new Date(event.starts_at), "yyyy-MM-dd'T'HH:mm") : '');
      setEndsAt(event.ends_at ? format(new Date(event.ends_at), "yyyy-MM-dd'T'HH:mm") : '');
      setTimezone(event.timezone || 'America/New_York');
      setCoverImageUrl(event.cover_image_url || '');
      setIsPublished(event.is_published);
    }
  }, [event]);

  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateEventData | UpdateEventData = {
      ...(event && { id: event.id }),
      title,
      slug,
      short_description: shortDescription || undefined,
      description: description || undefined,
      venue_name: venueName || undefined,
      venue_address: venueAddress || undefined,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
      cover_image_url: coverImageUrl || undefined,
      is_published: isPublished,
      timezone,
    };

    await onSubmit(data);
    navigate('/events/manage');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Annual Leadership Conference"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/events/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="annual-leadership-conference"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description</Label>
            <Input
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="A brief summary for event listings"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{shortDescription.length}/200 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Full Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed event description..."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Date & Time *</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date & Time</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Event Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className="w-full">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select timezone" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label} ({getTimezoneAbbreviation(tz.value)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All agenda times will be displayed in this timezone by default
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name</Label>
            <Input
              id="venueName"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Grand Ballroom"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueAddress">Venue Address</Label>
            <Textarea
              id="venueAddress"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="123 Main Street, City, State 12345"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Cover Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">Image URL</Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                id="coverImageUrl"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          {coverImageUrl && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={coverImageUrl}
                alt="Cover preview"
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublished">Publish Event</Label>
              <p className="text-sm text-muted-foreground">
                Published events are visible to the public
              </p>
            </div>
            <Switch
              id="isPublished"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/events/manage')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
