import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { toast } from 'sonner';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface User {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: AppRole;
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
  const [editRole, setEditRole] = useState<AppRole>('lms_student');
  const [editChapter, setEditChapter] = useState<string>('none');
  const [pendingChanges, setPendingChanges] = useState<Record<string, { role?: AppRole; chapter_id?: string }>>({});
  const { toast: showToast } = useToast();

  // Fetch all profiles with approval status
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['all-users-with-approval'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, chapter_id, is_approved, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('lms_chapters')
        .select('id, name');

      if (chaptersError) throw chaptersError;

      // Combine data
      const combinedUsers: User[] = (profilesData || []).map((profile) => {
        const roleEntry = rolesData?.find((r) => r.user_id === profile.user_id);
        const chapter = chaptersData?.find((c) => c.id === profile.chapter_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: roleEntry?.role || 'lms_student',
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
      // Update role using upsert to avoid delete-then-insert race condition
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editRole })
        .eq('user_id', editingUser.user_id);

      if (roleError) throw roleError;

      // Update chapter
      await supabase
        .from('profiles')
        .update({ chapter_id: editChapter === 'none' ? null : editChapter })
        .eq('user_id', editingUser.user_id);

      showToast({
        title: 'User updated',
        description: 'User role and chapter have been updated.',
      });

      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['all-users-with-approval'] });
    } catch (error: any) {
      showToast({
        variant: 'destructive',
        title: 'Error updating user',
        description: error.message,
      });
    }
  };

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, chapterId, role }: { userId: string; chapterId?: string; role?: AppRole }) => {
      const profileUpdate: { is_approved: boolean; chapter_id?: string } = { is_approved: true };
      if (chapterId) {
        profileUpdate.chapter_id = chapterId;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', userId);
      
      if (profileError) throw profileError;

      if (role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        
        if (roleError) throw roleError;
      }
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

  const getSelectedRole = (user: User): AppRole => {
    return pendingChanges[user.user_id]?.role || user.role || 'lms_student';
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
                                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="lms_student">LMS Student</SelectItem>
                                    <SelectItem value="lms_advisor">LMS Advisor</SelectItem>
                                    <SelectItem value="lms_admin">LMS Admin</SelectItem>
                                    <SelectItem value="em_advisor">EM Purchaser</SelectItem>
                                    <SelectItem value="em_manager">EM Manager</SelectItem>
                                    <SelectItem value="em_admin">EM Admin</SelectItem>
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
                  {/* Desktop table view */}
                  <div className="hidden md:block">
                    <ResponsiveTable>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Chapter</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
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
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={getSelectedRole(user)}
                            onValueChange={(value) => handlePendingChange(user.user_id, 'role', value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lms_student">LMS Student</SelectItem>
                              <SelectItem value="lms_advisor">LMS Advisor</SelectItem>
                              <SelectItem value="lms_admin">LMS Admin</SelectItem>
                              <SelectItem value="em_advisor">EM Purchaser</SelectItem>
                              <SelectItem value="em_manager">EM Manager</SelectItem>
                              <SelectItem value="em_admin">EM Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={getSelectedChapter(user)}
                            onValueChange={(value) => handlePendingChange(user.user_id, 'chapter_id', value)}
                          >
                            <SelectTrigger className="w-[180px]">
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
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(user.user_id)}
                            disabled={approveMutation.isPending}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                      </TableBody>
                    </Table>
                  </ResponsiveTable>
                </div>
                
                {/* Mobile card view */}
                <div className="md:hidden space-y-3">
                  {pendingUsers.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.full_name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(user.created_at), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-16">Role</Label>
                          <Select
                            value={getSelectedRole(user)}
                            onValueChange={(value) => handlePendingChange(user.user_id, 'role', value)}
                          >
                            <SelectTrigger className="flex-1 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lms_student">LMS Student</SelectItem>
                              <SelectItem value="lms_advisor">LMS Advisor</SelectItem>
                              <SelectItem value="lms_admin">LMS Admin</SelectItem>
                              <SelectItem value="em_advisor">EM Purchaser</SelectItem>
                              <SelectItem value="em_manager">EM Manager</SelectItem>
                              <SelectItem value="em_admin">EM Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-16">Chapter</Label>
                          <Select
                            value={getSelectedChapter(user)}
                            onValueChange={(value) => handlePendingChange(user.user_id, 'chapter_id', value)}
                          >
                            <SelectTrigger className="flex-1 h-8">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {chapters.map((chapter) => (
                                <SelectItem key={chapter.id} value={chapter.id}>
                                  {chapter.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(user.user_id)}
                          disabled={approveMutation.isPending}
                          className="w-full mt-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
