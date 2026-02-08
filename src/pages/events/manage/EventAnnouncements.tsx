import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send, Bell, BellOff, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AudienceSelector } from '@/components/events/push/AudienceSelector';
import { useAudienceCounts, type AudienceType, type AudienceFilter } from '@/hooks/usePushNotifications';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EventAnnouncementRecord {
  id: string;
  event_id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  push_notification_id: string | null;
  audience_type: string;
  audience_filter: Record<string, unknown> | null;
}

export default function EventAnnouncements() {
  const { selectedEventId, hasSelection } = useEventSelection();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [expiresAt, setExpiresAt] = useState('');
  const [sendPush, setSendPush] = useState(false);
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});

  const { data: audienceCounts } = useAudienceCounts(selectedEventId);

  // Fetch announcements for this event
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['event-announcements', selectedEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('event_id', selectedEventId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EventAnnouncementRecord[];
    },
    enabled: !!selectedEventId,
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the announcement
      const insertData: Record<string, unknown> = {
        event_id: selectedEventId,
        title: title.trim(),
        content: content.trim(),
        priority,
        is_active: true,
        expires_at: expiresAt || null,
        created_by: user!.id,
        audience_type: audienceType,
        audience_filter: Object.keys(audienceFilter).length > 0 ? audienceFilter : null,
      };
      
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .insert(insertData as any)
        .select()
        .single();

      if (announcementError) throw announcementError;

      // 2. Optionally send push notification
      if (sendPush) {
        const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            event_id: selectedEventId,
            title: title.trim(),
            message: content.trim().slice(0, 200),
            audience_type: audienceType,
            audience_filter: Object.keys(audienceFilter).length > 0 ? audienceFilter : undefined,
          },
        });

        if (pushError) {
          console.error('Push notification failed:', pushError);
          toast.warning('Announcement created but push notification failed to send');
        } else if (pushResult?.error) {
          console.error('Push notification error:', pushResult.error);
          toast.warning('Announcement created but push notification failed');
        } else {
          toast.success(`Announcement created and push sent to ${pushResult.recipient_count} attendees`);
          return announcement;
        }
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements', selectedEventId] });
      if (!sendPush) toast.success('Announcement created successfully');
      // Reset form
      setTitle('');
      setContent('');
      setPriority('normal');
      setExpiresAt('');
      setSendPush(false);
      setAudienceType('all');
      setAudienceFilter({});
    },
    onError: (error: Error) => {
      toast.error('Failed to create announcement: ' + error.message);
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements', selectedEventId] });
      toast.success('Announcement deleted');
    },
    onError: () => {
      toast.error('Failed to delete announcement');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('announcements').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements', selectedEventId] });
    },
  });

  if (!hasSelection) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Event Announcements</h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Event Selected</AlertTitle>
          <AlertDescription>
            Please select an event from the sidebar to manage announcements.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Event Announcements</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">In-App + Push Notifications</CardTitle>
          <CardDescription>
            Announcements appear on the attendee home screen in the mobile app.
            You can optionally send a push notification alongside each announcement to alert attendees immediately.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                Create Announcement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="ann-title">Title *</Label>
                  <Input
                    id="ann-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement title..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann-content">Content *</Label>
                  <Textarea
                    id="ann-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your announcement..."
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ann-priority">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as 'normal' | 'urgent')}>
                      <SelectTrigger id="ann-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ann-expires">Expires At (optional)</Label>
                    <Input
                      id="ann-expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                {/* Push Notification Toggle */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {sendPush ? (
                          <Bell className="h-5 w-5 text-primary" />
                        ) : (
                          <BellOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">Also Send Push Notification</p>
                          <p className="text-xs text-muted-foreground">
                            Alert attendees on their devices immediately
                          </p>
                        </div>
                      </div>
                      <Switch checked={sendPush} onCheckedChange={setSendPush} />
                    </div>
                  </CardContent>
                </Card>

                {/* Audience Selector — shown when push is enabled */}
                {sendPush && (
                  <AudienceSelector
                    eventId={selectedEventId!}
                    audienceType={audienceType}
                    audienceFilter={audienceFilter}
                    onAudienceTypeChange={setAudienceType}
                    onAudienceFilterChange={setAudienceFilter}
                    audienceCounts={audienceCounts}
                  />
                )}

                <Button type="submit" disabled={!isValid || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {sendPush ? 'Create & Send Push' : 'Create Announcement'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Announcement History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Announcement History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : !announcements?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <Card key={ann.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium">{ann.title}</span>
                              <Badge variant={ann.is_active ? 'default' : 'secondary'} className="text-xs">
                                {ann.is_active ? 'active' : 'inactive'}
                              </Badge>
                              {ann.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-xs">
                                  urgent
                                </Badge>
                              )}
                              {ann.push_notification_id && (
                                <Badge variant="outline" className="text-xs">
                                  <Bell className="h-3 w-3 mr-1" />
                                  pushed
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(ann.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Switch
                              checked={ann.is_active}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ id: ann.id, is_active: checked })
                              }
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove this announcement. Already-sent push notifications
                                    cannot be recalled.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(ann.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
