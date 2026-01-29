import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function AttendeeLogin() {
  const { isAuthenticated, sendCode, verifyCode } = useOrderPortal();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/attendee/app/home" replace />;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLocalLoading(true);
    setLocalError(null);
    
    const result = await sendCode(email.trim());
    
    setLocalLoading(false);
    
    if (result.success) {
      setSuccessMessage(result.message || 'Code sent!');
      setStep('code');
    } else {
      setLocalError(result.message || 'Failed to send code');
    }
  };

  const handleVerifyCode = async (value: string) => {
    setCode(value);
    
    if (value.length === 6) {
      setLocalLoading(true);
      setLocalError(null);
      
      const result = await verifyCode(email, value);
      
      setLocalLoading(false);
      
      if (!result.success) {
        setLocalError(result.message || 'Invalid code');
        setCode('');
      }
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
    setLocalError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Event Check-In</CardTitle>
            <CardDescription>
              {step === 'email' 
                ? 'Enter your email to access your event tickets'
                : 'Enter the 6-digit code sent to your email'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={handleSendCode} className="space-y-4">
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
                      disabled={localLoading}
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
                  disabled={!email.trim() || localLoading}
                >
                  {localLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Access Code'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                {successMessage && (
                  <p className="text-sm text-muted-foreground">{successMessage}</p>
                )}

                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={handleVerifyCode}
                    disabled={localLoading}
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
                  
                  {localLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  )}
                  
                  {localError && (
                    <p className="text-sm text-destructive">{localError}</p>
                  )}
                </div>

                <div className="text-center">
                  <button
                    onClick={handleSendCode}
                    className="text-sm text-primary hover:underline"
                    disabled={localLoading}
                  >
                    Resend code
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
