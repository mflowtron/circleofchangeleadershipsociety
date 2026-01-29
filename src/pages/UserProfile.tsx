import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Linkedin, ArrowLeft, Users } from 'lucide-react';
import { CircleLoader } from '@/components/ui/circle-loader';

interface UserProfileData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  headline: string | null;
  chapter: {
    name: string;
  } | null;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to own profile page if viewing self
    if (userId && user?.id === userId) {
      navigate('/profile', { replace: true });
      return;
    }

    fetchProfile();
  }, [userId, user?.id, navigate]);

  const fetchProfile = async () => {
    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          avatar_url,
          linkedin_url,
          headline,
          chapter:chapters(name)
        `)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('User not found');
        } else {
          throw fetchError;
        }
        return;
      }

      setProfile(data as UserProfileData);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <CircleLoader size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || 'User not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Go Back
      </Button>

      <Card>
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
              
              {profile.headline && (
                <p className="text-muted-foreground">{profile.headline}</p>
              )}
              
              {profile.chapter && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Users className="h-4 w-4" />
                  <span>{profile.chapter.name}</span>
                </div>
              )}
            </div>

            {profile.linkedin_url && (
              <Button asChild variant="outline" className="gap-2">
                <a 
                  href={profile.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Linkedin className="h-4 w-4" />
                  View LinkedIn Profile
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
