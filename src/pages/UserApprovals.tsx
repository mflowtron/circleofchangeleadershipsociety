import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  chapter_id: string | null;
  created_at: string;
  is_approved: boolean;
}

interface Chapter {
  id: string;
  name: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

export default function UserApprovals() {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, { role?: AppRole; chapter_id?: string }>>({});

  // Fetch pending users
  const { data: pendingUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PendingUser[];
    },
  });

  // Fetch chapters for assignment
  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Chapter[];
    },
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles-pending'],
    queryFn: async () => {
      if (!pendingUsers?.length) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', pendingUsers.map(u => u.user_id));
      
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!pendingUsers?.length,
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, chapterId, role }: { userId: string; chapterId?: string; role?: AppRole }) => {
      // Update profile to approved
      const profileUpdate: { is_approved: boolean; chapter_id?: string } = { is_approved: true };
      if (chapterId) {
        profileUpdate.chapter_id = chapterId;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', userId);
      
      if (profileError) throw profileError;

      // Update role if specified
      if (role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles-pending'] });
      toast.success('User approved successfully');
    },
    onError: (error) => {
      console.error('Approval error:', error);
      toast.error('Failed to approve user');
    },
  });

  const handleChange = (userId: string, field: 'role' | 'chapter_id', value: string) => {
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
    
    // Clear pending changes for this user
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[userId];
      return newChanges;
    });
  };

  const getUserRole = (userId: string): AppRole | undefined => {
    return userRoles?.find(r => r.user_id === userId)?.role;
  };

  const getSelectedRole = (userId: string): AppRole => {
    return pendingChanges[userId]?.role || getUserRole(userId) || 'student';
  };

  const getSelectedChapter = (userId: string): string => {
    const user = pendingUsers?.find(u => u.user_id === userId);
    return pendingChanges[userId]?.chapter_id || user?.chapter_id || '';
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Approvals</h1>
        <p className="text-muted-foreground">Review and approve new user registrations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Pending Approvals</CardTitle>
          </div>
          <CardDescription>
            {pendingUsers?.length || 0} user{pendingUsers?.length !== 1 ? 's' : ''} awaiting approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!pendingUsers?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No pending approvals</p>
              <p className="text-muted-foreground">All users have been reviewed</p>
            </div>
          ) : (
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
                        value={getSelectedRole(user.user_id)}
                        onValueChange={(value) => handleChange(user.user_id, 'role', value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="advisor">Advisor</SelectItem>
                          <SelectItem value="event_organizer">Event Organizer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={getSelectedChapter(user.user_id)}
                        onValueChange={(value) => handleChange(user.user_id, 'chapter_id', value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select chapter..." />
                        </SelectTrigger>
                        <SelectContent>
                          {chapters?.map((chapter) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
