import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pencil, CheckCircle, Clock, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface User {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  chapter_id: string | null;
  chapter_name: string | null;
  is_approved: boolean;
  created_at: string;
}

interface Chapter {
  id: string;
  name: string;
}

export default function Users() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editChapter, setEditChapter] = useState<string>('none');
  const [pendingChanges, setPendingChanges] = useState<Record<string, { role?: UserRole; chapter_id?: string }>>({});

  // Fetch all profiles with approval status
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['all-users-with-approval'],
    queryFn: async () => {
      // Fetch all profiles with role
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, chapter_id, is_approved, created_at, role')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, name');

      if (chaptersError) throw chaptersError;

      // Combine data
      const combinedUsers: User[] = (profilesData || []).map((profile) => {
        const chapter = chaptersData?.find((c) => c.id === profile.chapter_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role || 'member',
          chapter_id: profile.chapter_id,
          chapter_name: chapter?.name || null,
          is_approved: profile.is_approved,
          created_at: profile.created_at,
        };
      });

      return { users: combinedUsers, chapters: chaptersData || [] };
    },
  });

  const users = allUsers?.users || [];
  const chapters = allUsers?.chapters || [];
  const approvedUsers = users.filter(u => u.is_approved);
  const pendingUsers = users.filter(u => !u.is_approved);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditChapter(user.chapter_id || 'none');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      // Update profile with role and chapter
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: editRole,
          chapter_id: editChapter === 'none' ? null : editChapter 
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      toast.success('User updated', {
        description: 'User role and chapter have been updated.',
      });

      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['all-users-with-approval'] });
    } catch (error: any) {
      toast.error('Error updating user', {
        description: error.message,
      });
    }
  };

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, chapterId, role }: { userId: string; chapterId?: string; role?: UserRole }) => {
      const profileUpdate: { is_approved: boolean; chapter_id?: string; role?: UserRole } = { is_approved: true };
      if (chapterId) {
        profileUpdate.chapter_id = chapterId;
      }
      if (role) {
        profileUpdate.role = role;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-with-approval'] });
      toast.success('User approved successfully');
    },
    onError: (error) => {
      console.error('Approval error:', error);
      toast.error('Failed to approve user');
    },
  });

  const handlePendingChange = (userId: string, field: 'role' | 'chapter_id', value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleApprove = (userId: string) => {
    const changes = pendingChanges[userId] || {};
    approveMutation.mutate({
      userId,
      chapterId: changes.chapter_id,
      role: changes.role,
    });
    
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[userId];
      return newChanges;
    });
  };

  const getSelectedRole = (user: User): UserRole => {
    return pendingChanges[user.user_id]?.role || user.role || 'member';
  };

  const getSelectedChapter = (user: User): string => {
    return pendingChanges[user.user_id]?.chapter_id || user.chapter_id || '';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <Card className="animate-pulse">
          <CardContent className="h-64" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
      </div>

      <Tabs defaultValue="all-users">
        <TabsList>
          <TabsTrigger value="all-users">All Users</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending Approval
            {pendingUsers.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{approvedUsers.length} approved users</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Chapter</TableHead>
                      <TableHead className="w-16 sm:w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[150px] sm:max-w-none">{user.full_name}</div>
                          {/* Mobile-only: show role inline */}
                          <div className="sm:hidden text-xs text-muted-foreground capitalize">{user.role}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">{user.role}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.chapter_name || 'None'}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User: {editingUser?.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="advisor">Advisor</SelectItem>
                                    <SelectItem value="organizer">Organizer</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Chapter</Label>
                                <Select value={editChapter} onValueChange={setEditChapter}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {chapters.map((chapter) => (
                                      <SelectItem key={chapter.id} value={chapter.id}>
                                        {chapter.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={handleSaveUser} className="w-full">
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Pending Approvals</CardTitle>
              </div>
              <CardDescription>
                {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingUsers.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UsersIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium">No pending approvals</p>
                  <p className="text-muted-foreground">All users have been reviewed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.full_name} 
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-primary">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={getSelectedRole(user)}
                          onValueChange={(value) => handlePendingChange(user.user_id, 'role', value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="advisor">Advisor</SelectItem>
                            <SelectItem value="organizer">Organizer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={getSelectedChapter(user)}
                          onValueChange={(value) => handlePendingChange(user.user_id, 'chapter_id', value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select chapter..." />
                          </SelectTrigger>
                          <SelectContent>
                            {chapters.map((chapter) => (
                              <SelectItem key={chapter.id} value={chapter.id}>
                                {chapter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(user.user_id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
