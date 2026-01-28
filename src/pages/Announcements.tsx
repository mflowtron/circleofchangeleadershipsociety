import { useState } from 'react';
import { useAnnouncements, type Announcement } from '@/hooks/useAnnouncements';
import CreateAnnouncementForm from '@/components/announcements/CreateAnnouncementForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Megaphone, Trash2, Calendar, Clock } from 'lucide-react';
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

export default function Announcements() {
  const { allAnnouncements, loading, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements();

  const isExpired = (announcement: Announcement) => {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  };

  const getStatus = (announcement: Announcement) => {
    if (isExpired(announcement)) return 'expired';
    if (!announcement.is_active) return 'inactive';
    return 'active';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and manage announcements for all users</p>
      </div>

      <CreateAnnouncementForm onSubmit={createAnnouncement} />

      <Card className="border-border/50 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">All Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : allAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No announcements yet</h3>
              <p className="text-muted-foreground">Create your first announcement above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allAnnouncements.map((announcement) => {
                const status = getStatus(announcement);
                
                return (
                  <div
                    key={announcement.id}
                    className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {announcement.title}
                          </h3>
                          <Badge
                            variant={
                              status === 'active' ? 'default' :
                              status === 'expired' ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {announcement.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                          </span>
                          {announcement.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={announcement.is_active}
                          onCheckedChange={(checked) =>
                            updateAnnouncement(announcement.id, { is_active: checked })
                          }
                          aria-label="Toggle active"
                        />
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this announcement? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAnnouncement(announcement.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
