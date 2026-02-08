import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RegistrationLayout } from '@/components/registration/RegistrationLayout';
import { useRegistration } from '@/hooks/useRegistration';

export default function RegisterVerify() {
  const navigate = useNavigate();
  const { isVerified, sendOtp } = useRegistration();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If already verified, redirect to dashboard
  if (isVerified) {
    navigate('/register/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await sendOtp.mutateAsync(trimmedEmail);
      // Navigate to code entry, passing email in state
      navigate('/register/verify/code', { state: { email: trimmedEmail } });
    } catch {
      setError('Failed to send verification code. Please try again.');
    }
  };

  return (
    <RegistrationLayout>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: '#6B1D3A' }}
          >
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
            Find Your Order
          </h1>
          <p className="text-sm" style={{ color: '#8B6F5E' }}>
            Enter the email you used when purchasing. We'll send a verification code to confirm it's you.
          </p>
        </div>

        <Card className="border-0 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" style={{ color: '#4A3728' }}>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="jane@university.edu"
                  disabled={sendOtp.isPending}
                  className="bg-white"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full py-5 font-semibold rounded-xl"
                disabled={sendOtp.isPending || !email.trim()}
                style={{
                  backgroundColor: email.trim() && !sendOtp.isPending ? '#DFA51F' : undefined,
                  color: email.trim() && !sendOtp.isPending ? '#2D0A18' : undefined,
                }}
              >
                {sendOtp.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs mt-6" style={{ color: '#8B6F5E' }}>
          We'll email you a 6-digit code. No password required.
        </p>

        <div className="text-center mt-8">
          <Link
            to="/events"
            className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
            style={{ color: '#6B1D3A' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Don't have a registration? Browse events
          </Link>
        </div>
      </div>
    </RegistrationLayout>
  );
}
