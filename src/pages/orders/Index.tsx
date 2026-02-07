import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function OrderPortalIndex() {
  const navigate = useNavigate();
  const { isAuthenticated, sendMagicLink, loading, error } = useOrderPortal();
  
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Small delay to allow session to load
    const timer = setTimeout(() => {
      setCheckingAuth(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/my-orders/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show loading while checking auth
  if (checkingAuth || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    const result = await sendMagicLink(email.trim());
    if (result.success) {
      setEmailSent(true);
    } else {
      setLocalError(result.message);
    }
  };

  const handleResend = async () => {
    setLocalError(null);
    const result = await sendMagicLink(email.trim());
    if (!result.success) {
      setLocalError(result.message);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Manage Your Orders</CardTitle>
          <CardDescription>
            {!emailSent 
              ? 'Enter the email address you used to purchase tickets'
              : 'Check your email for the sign-in link'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              
              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Send Sign-In Link
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
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
                  Click the link in your email to access your orders. The link expires in 1 hour.
                </p>
              </div>
              
              <div className="flex flex-col gap-2 text-center pt-4 border-t">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Resend link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    setLocalError(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
