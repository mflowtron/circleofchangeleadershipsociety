import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RegistrationLayout } from '@/components/registration/RegistrationLayout';
import { OtpInput } from '@/components/registration/OtpInput';
import { useRegistration } from '@/hooks/useRegistration';
import { toast } from 'sonner';

export default function RegisterCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;

  const { verifyOtp, sendOtp, saveSession } = useRegistration();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) {
      navigate('/register/verify', { replace: true });
    }
  }, [email, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = useCallback(async () => {
    if (!email || code.length !== 6) return;
    setError(null);

    try {
      const result = await verifyOtp.mutateAsync({ email, code });

      if (result.valid && result.session_token) {
        saveSession(email, result.session_token);
        toast.success('Verified successfully');
        navigate('/register/dashboard', { replace: true });
      } else {
        setError('Incorrect code. Please try again.');
        setCode('');
      }
    } catch {
      setError('Verification failed. Please try again.');
      setCode('');
    }
  }, [email, code, verifyOtp, saveSession, navigate]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !verifyOtp.isPending) {
      handleVerify();
    }
  }, [code, verifyOtp.isPending, handleVerify]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    try {
      await sendOtp.mutateAsync(email);
      setResendCooldown(60);
      toast.success('Code resent', { description: 'Check your email for the new code.' });
    } catch {
      toast.error('Failed to resend code');
    }
  };

  if (!email) return null;

  return (
    <RegistrationLayout>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: '#6B1D3A' }}
          >
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
            Enter Verification Code
          </h1>
          <p className="text-sm" style={{ color: '#8B6F5E' }}>
            We sent a 6-digit code to{' '}
            <span className="font-medium" style={{ color: '#2D0A18' }}>
              {email}
            </span>
          </p>
        </div>

        <Card className="border-0 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
          <CardContent className="p-6">
            <div className="space-y-5">
              <OtpInput
                value={code}
                onChange={(val) => {
                  setCode(val);
                  setError(null);
                }}
                disabled={verifyOtp.isPending}
              />

              {error && (
                <p className="text-sm text-center text-destructive">{error}</p>
              )}

              <Button
                onClick={handleVerify}
                className="w-full py-5 font-semibold rounded-xl"
                disabled={code.length !== 6 || verifyOtp.isPending}
                style={{
                  backgroundColor:
                    code.length === 6 && !verifyOtp.isPending ? '#DFA51F' : undefined,
                  color:
                    code.length === 6 && !verifyOtp.isPending ? '#2D0A18' : undefined,
                }}
              >
                {verifyOtp.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Access Order'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-3">
          <div>
            {resendCooldown > 0 ? (
              <p className="text-sm" style={{ color: '#8B6F5E' }}>
                Resend code in {resendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={sendOtp.isPending}
                className="text-sm underline underline-offset-2"
                style={{ color: '#6B1D3A' }}
              >
                {sendOtp.isPending ? 'Sending...' : "Didn't receive it? Resend code"}
              </button>
            )}
          </div>
          <div>
            <Link
              to="/register/verify"
              className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
              style={{ color: '#6B1D3A' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Use a different email
            </Link>
          </div>
        </div>
      </div>
    </RegistrationLayout>
  );
}
