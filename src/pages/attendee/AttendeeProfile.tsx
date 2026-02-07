import { useState } from 'react';
import { ArrowLeft, User, Building2, Briefcase, FileText, Eye, EyeOff, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAttendeeProfile } from '@/hooks/useAttendeeProfile';
import { useAttendee } from '@/contexts/AttendeeContext';
import { toast } from 'sonner';

export default function AttendeeProfile() {
  const navigate = useNavigate();
  const { selectedAttendee } = useAttendee();
  const { profile, loading, updating, updateProfile } = useAttendeeProfile();
  const { theme, resolvedTheme, setTheme } = useTheme();
  
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [openToNetworking, setOpenToNetworking] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize form from profile
  if (profile && !hasInitialized) {
    setDisplayName(profile.display_name || selectedAttendee?.attendee_name || '');
    setCompany(profile.company || '');
    setTitle(profile.title || '');
    setBio(profile.bio || '');
    setOpenToNetworking(profile.open_to_networking || false);
    setHasInitialized(true);
  }

  const handleSave = async () => {
    const result = await updateProfile({
      display_name: displayName.trim() || undefined,
      company: company.trim() || undefined,
      title: title.trim() || undefined,
      bio: bio.trim() || undefined,
      open_to_networking: openToNetworking
    });

    if (result.success) {
      toast.success('Profile updated', {
        description: 'Your networking profile has been saved'
      });
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to update profile',
      });
    }
  };

  const toggleNetworking = async (enabled: boolean) => {
    setOpenToNetworking(enabled);
    
    const result = await updateProfile({
      open_to_networking: enabled
    });

    if (result.success) {
      toast.success(enabled ? 'Networking enabled' : 'Networking disabled', {
        description: enabled 
          ? 'Other attendees can now find and message you'
          : 'You are hidden from the networking directory'
      });
    } else {
      setOpenToNetworking(!enabled);
      toast.error('Error', {
        description: result.error || 'Failed to update setting',
      });
    }
  };


  if (loading) {
    return (
      <div className="pb-20 p-4 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold flex-1">Networking Profile</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Networking Toggle Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {openToNetworking ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              Open to Networking
            </CardTitle>
            <CardDescription>
              {openToNetworking 
                ? 'You are visible in the networking directory and can receive messages'
                : 'You are hidden from the directory. Enable this to connect with others'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {openToNetworking ? 'Discoverable' : 'Hidden'}
              </span>
              <Switch
                checked={openToNetworking}
                onCheckedChange={toggleNetworking}
                disabled={updating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-5 w-5 text-muted-foreground" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the app looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(value) => value && setTheme(value)}
              className="w-full justify-between bg-muted rounded-lg p-1"
            >
              <ToggleGroupItem 
                value="light" 
                className="flex-1 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <Sun className="h-4 w-4" />
                <span className="text-xs">Light</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="system" 
                className="flex-1 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <Monitor className="h-4 w-4" />
                <span className="text-xs">System</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="dark" 
                className="flex-1 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <Moon className="h-4 w-4" />
                <span className="text-xs">Dark</span>
              </ToggleGroupItem>
            </ToggleGroup>
            
            <p className="text-xs text-muted-foreground text-center">
              {theme === 'system' 
                ? `Following system preference (${resolvedTheme})`
                : `Using ${resolvedTheme} color scheme`
              }
            </p>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Profile</CardTitle>
            <CardDescription>
              This information is shown when people find you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Display Name
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company / School
              </Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Google, UT Austin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Bio
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others a bit about yourself..."
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/300
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={updating}
        >
          {updating ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
