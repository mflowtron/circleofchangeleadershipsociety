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
import { User, Mail, Shield, Save } from 'lucide-react';

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
        description: 'Your changes have been saved.',
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
  const roleColor = role === 'admin' ? 'bg-primary text-primary-foreground' : role === 'advisor' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Profile Header Card */}
      <Card className="shadow-soft border-border/50 overflow-hidden">
        <div className="h-24 bg-gradient-gold" />
        <CardContent className="relative pt-0 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-medium">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 pb-1">
              <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Badge className={`${roleColor} px-4 py-1.5 text-sm font-medium`}>
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              {roleLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Card */}
      <Card className="shadow-soft border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-11 bg-muted/30 border-border/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="h-11 bg-muted/50 border-border/50 rounded-xl text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl btn-gold-glow font-semibold" 
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
