import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface User {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  chapter_id: string | null;
  chapter_name: string | null;
}

interface Chapter {
  id: string;
  name: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('student');
  const [editChapter, setEditChapter] = useState<string>('none');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, chapter_id');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, name');

      if (chaptersError) throw chaptersError;

      setChapters(chaptersData || []);

      // Combine data
      const combinedUsers: User[] = (profilesData || []).map((profile) => {
        const roleEntry = rolesData?.find((r) => r.user_id === profile.user_id);
        const chapter = chaptersData?.find((c) => c.id === profile.chapter_id);
        return {
          id: profile.user_id,
          email: '',
          full_name: profile.full_name,
          role: roleEntry?.role || 'student',
          chapter_id: profile.chapter_id,
          chapter_name: chapter?.name || null,
        };
      });

      setUsers(combinedUsers);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading users',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditChapter(user.chapter_id || 'none');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      // Update role - first delete existing, then insert new
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.id);

      await supabase
        .from('user_roles')
        .insert({ user_id: editingUser.id, role: editRole });

      // Update chapter
      await supabase
        .from('profiles')
        .update({ chapter_id: editChapter === 'none' ? null : editChapter })
        .eq('user_id', editingUser.id);

      toast({
        title: 'User updated',
        description: 'User role and chapter have been updated.',
      });

      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating user',
        description: error.message,
      });
    }
  };

  if (loading) {
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

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>{user.chapter_name || 'None'}</TableCell>
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
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="advisor">Advisor</SelectItem>
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
        </CardContent>
      </Card>
    </div>
  );
}
