import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import logoLight from '@/assets/coclc-logo-light.png';
import logoDark from '@/assets/coclc-logo-dark.png';
import { useTheme } from 'next-themes';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? logoDark : logoLight;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      error,
      data
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message
      });
      setLoading(false);
    } else if (data.user) {
      // Fetch profile to check approval status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', data.user.id)
        .single();
      
      const isApproved = profileData?.is_approved ?? false;
      
      if (!isApproved) {
        navigate('/pending-approval');
      } else {
        // Redirect to root - let RootRouter handle routing based on roles
        navigate('/');
      }
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName
        }
      }
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: error.message
      });
      setLoading(false);
    } else {
      toast({
        title: 'Account created!',
        description: 'Your account is pending approval.'
      });
      // New signups always go to pending approval
      navigate('/pending-approval');
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary/5 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-end gap-2">
        {/* Theme Toggle - just outside the modal */}
        <ThemeToggle />
        
        <Card className="w-full shadow-medium border-border/50 animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-6 p-4 rounded-2xl inline-block bg-transparent">
              <img src={logo} alt="Circle of Change" className="h-14" />
            </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Circle of Change Leadership Society
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft">
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20" />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold btn-gold-glow group" disabled={loading}>
                  {loading ? <div className="w-5 h-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> : <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 animate-fade-in">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                  <Input id="signup-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Enter your full name" className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Create a password (min 6 characters)" className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20" />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold btn-gold-glow group" disabled={loading}>
                  {loading ? <div className="w-5 h-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> : <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create Account
                    </>}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>;
}