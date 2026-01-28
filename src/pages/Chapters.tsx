import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Chapter {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Chapters() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChapters(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading chapters',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (chapter?: Chapter) => {
    if (chapter) {
      setEditingChapter(chapter);
      setName(chapter.name);
      setDescription(chapter.description || '');
    } else {
      setEditingChapter(null);
      setName('');
      setDescription('');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      if (editingChapter) {
        const { error } = await supabase
          .from('chapters')
          .update({ name, description: description || null })
          .eq('id', editingChapter.id);

        if (error) throw error;
        toast({ title: 'Chapter updated' });
      } else {
        const { error } = await supabase
          .from('chapters')
          .insert({ name, description: description || null });

        if (error) throw error;
        toast({ title: 'Chapter created' });
      }

      setDialogOpen(false);
      fetchChapters();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving chapter',
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Chapter deleted' });
      fetchChapters();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting chapter',
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Chapter Management</h1>
        <Card className="animate-pulse">
          <CardContent className="h-64" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Chapter Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Chapter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChapter ? 'Edit Chapter' : 'Create Chapter'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Class of 2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!name.trim()}>
                {editingChapter ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          {chapters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No chapters yet. Create your first chapter to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapters.map((chapter) => (
                  <TableRow key={chapter.id}>
                    <TableCell className="font-medium">{chapter.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {chapter.description || '-'}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(chapter.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(chapter)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(chapter.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
