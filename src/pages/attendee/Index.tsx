import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function AttendeeLogin() {
  const { isAuthenticated, sendMagicLink, loading } = useOrderPortal();
  
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/attendee/app/home" replace />;
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLocalLoading(true);
    setLocalError(null);
    
    const result = await sendMagicLink(email.trim());
    
    setLocalLoading(false);
    
    if (result.success) {
      setEmailSent(true);
    } else {
      setLocalError(result.message || 'Failed to send magic link');
    }
  };

  const handleResend = async () => {
    setLocalLoading(true);
    setLocalError(null);
    
    const result = await sendMagicLink(email.trim());
    
    setLocalLoading(false);
    
    if (!result.success) {
      setLocalError(result.message || 'Failed to send magic link');
    }
  };

  const isLoading = loading || localLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Event Check-In</CardTitle>
            <CardDescription>
              {!emailSent 
                ? 'Enter your email to access your event tickets'
                : 'Check your email for the sign-in link'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>
                
                {localError && (
                  <p className="text-sm text-destructive">{localError}</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!email.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Sign-In Link'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      We sent a sign-in link to
                    </p>
                    <p className="font-medium">{email}</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Click the link in your email to access your event tickets. The link expires in 1 hour.
                  </p>
                </div>

                <div className="flex flex-col gap-2 text-center pt-4 border-t">
                  <button
                    onClick={handleResend}
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Resend link'}
                  </button>
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setLocalError(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          Use the email address associated with your event registration
        </p>
      </div>
    </div>
  );
}
