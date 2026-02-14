import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Save, Camera, Loader2, Linkedin, Briefcase } from 'lucide-react';

export default function Profile() {
  const location = useLocation();
  const isEventsContext = location.pathname.startsWith('/events');
  const { profile, isLMSAdmin, isLMSAdvisor, isEMAdmin, isEMManager, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '');
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [linkedinError, setLinkedinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidLinkedInUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid (optional field)
    const pattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
    return pattern.test(url);
  };

  const normalizeLinkedInUrl = (url: string): string => {
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleLinkedinChange = (value: string) => {
    setLinkedinUrl(value);
    if (value && !isValidLinkedInUrl(value)) {
      setLinkedinError('Please enter a valid LinkedIn URL (e.g., linkedin.com/in/username)');
    } else {
      setLinkedinError('');
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file.',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please upload an image smaller than 5MB.',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage (will overwrite existing avatar)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);

      toast.success('Avatar updated', {
        description: 'Your profile picture has been changed.',
      });

      // Reload page to update avatar everywhere
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      toast.error('Upload failed', {
        description: error.message,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate LinkedIn URL before saving
    if (linkedinUrl && !isValidLinkedInUrl(linkedinUrl)) {
      setLinkedinError('Please enter a valid LinkedIn URL (e.g., linkedin.com/in/username)');
      return;
    }

    setLoading(true);
    try {
      const normalizedLinkedin = normalizeLinkedInUrl(linkedinUrl);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          linkedin_url: normalizedLinkedin || null,
          headline: headline || null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated', {
        description: 'Your changes have been saved.',
      });
    } catch (error: any) {
      toast.error('Error updating profile', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine role label and styling based on context
  const getRoleInfo = () => {
    if (isEventsContext) {
      // Events Management roles
      if (isEMAdmin) return { label: 'Admin', color: 'bg-primary text-primary-foreground' };
      if (isEMManager) return { label: 'Organizer', color: 'bg-secondary text-secondary-foreground' };
      return { label: 'Staff', color: 'bg-muted text-muted-foreground' };
    } else {
      // LMS roles
      if (isLMSAdmin) return { label: 'Admin', color: 'bg-primary text-primary-foreground' };
      if (isLMSAdvisor) return { label: 'Advisor', color: 'bg-secondary text-secondary-foreground' };
      return { label: 'Student', color: 'bg-muted text-muted-foreground' };
    }
  };
  const { label: roleLabel, color: roleColor } = getRoleInfo();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Profile Header Card */}
      <Card className="shadow-soft border-border/50 overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-primary via-amber-mid to-amber-deep relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        </div>
        <CardContent className="relative pt-0 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-medium">
                <AvatarImage src={avatarUrl || profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
            <div className="text-center sm:text-left flex-1 pb-1">
              <h2 className="text-xl font-bold text-foreground drop-shadow-sm">{profile?.full_name}</h2>
              {profile?.headline && (
                <p className="text-sm text-muted-foreground">{profile.headline}</p>
              )}
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Tap avatar to change photo</p>
            </div>
            <div className="flex items-center gap-2">
              {profile?.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#0A66C2] hover:bg-[#004182] transition-colors"
                  title="View LinkedIn Profile"
                >
                  <Linkedin className="h-4 w-4 text-white" />
                </a>
              )}
              <Badge className={`${roleColor} px-4 py-1.5 text-sm font-medium`}>
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                {roleLabel}
              </Badge>
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="headline" className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Headline
              </Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Student at University of..."
                maxLength={100}
                className="h-11 bg-muted/30 border-border/50 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">A short description about yourself (optional)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="text-sm font-medium flex items-center gap-2">
                <Linkedin className="h-4 w-4" />
                LinkedIn Profile
              </Label>
              <Input
                id="linkedin"
                value={linkedinUrl}
                onChange={(e) => handleLinkedinChange(e.target.value)}
                placeholder="linkedin.com/in/your-username"
                className={`h-11 bg-muted/30 border-border/50 rounded-xl ${linkedinError ? 'border-destructive' : ''}`}
              />
              {linkedinError ? (
                <p className="text-xs text-destructive">{linkedinError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Add your LinkedIn profile URL (optional)</p>
              )}
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
