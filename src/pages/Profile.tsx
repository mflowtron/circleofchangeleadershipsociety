import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function Profile() {
  const { profile, role, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Profile</h1>

      <Card>
        <CardHeader className="text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <CardTitle>{profile?.full_name}</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
          <Badge variant="secondary" className="mt-2 mx-auto">
            {roleLabel}
          </Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
