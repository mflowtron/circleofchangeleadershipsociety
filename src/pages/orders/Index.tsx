import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

export default function OrderPortalIndex() {
  const navigate = useNavigate();
  const { isAuthenticated, sendCode, verifyCode, loading, error } = useOrderPortal();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [codeSent, setCodeSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Small delay to allow session to load from localStorage
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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    const result = await sendCode(email.trim());
    if (result.success) {
      setCodeSent(true);
      setStep('code');
    } else {
      setLocalError(result.message);
    }
  };

  const handleVerifyCode = async () => {
    setLocalError(null);
    
    if (code.length !== 6) {
      setLocalError('Please enter the complete 6-digit code');
      return;
    }

    const result = await verifyCode(email.trim(), code);
    if (!result.success) {
      setLocalError(result.message);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    setLocalError(null);
    const result = await sendCode(email.trim());
    if (!result.success) {
      setLocalError(result.message);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-background flex flex-col pt-safe">
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Manage Your Orders</CardTitle>
          <CardDescription>
            {step === 'email' 
              ? 'Enter the email address you used to purchase tickets'
              : 'Enter the 6-digit code sent to your email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
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
                Send Access Code
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              {codeSent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Code sent to {email}</span>
                </div>
              )}
              
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              {displayError && (
                <p className="text-sm text-destructive text-center">{displayError}</p>
              )}
              
              <Button 
                onClick={handleVerifyCode} 
                className="w-full" 
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Verify Code
              </Button>
              
              <div className="flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                  disabled={loading}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
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
    </div>
  );
}
