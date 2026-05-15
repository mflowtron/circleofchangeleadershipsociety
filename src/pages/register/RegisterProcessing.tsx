import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, Loader2, XCircle, Mail, ArrowRight, ListChecks, Users, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RegistrationLayout } from '@/components/registration/RegistrationLayout';
import { useEvent } from '@/hooks/useEvents';
import { useRegistration } from '@/hooks/useRegistration';
import type { VerifyPaymentResponse } from '@/types/registration';

export default function RegisterProcessing() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const sessionId = searchParams.get('session_id');

  const { data: event } = useEvent(slug || '');
  const { verifyPayment } = useRegistration();

  const [result, setResult] = useState<VerifyPaymentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!orderId) {
        setError('Order not found');
        setIsLoading(false);
        return;
      }

      try {
        const data = await verifyPayment.mutateAsync({
          order_id: orderId,
          session_id: sessionId || undefined,
        });

        if (data.success && data.order) {
          setResult(data);
        } else if (data.order) {
          setResult(data);
        } else {
          throw new Error('Unable to verify order');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify order');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, sessionId]);

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const getTotalTickets = () => {
    if (!result?.order) return 0;
    return result.order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Loading state
  if (isLoading) {
    return (
      <RegistrationLayout>
        <div className="max-w-xl mx-auto text-center py-32 px-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4" style={{ color: '#DFA51F' }} />
          <h1 className="text-xl font-serif font-semibold" style={{ color: '#2D0A18' }}>
            Processing Payment...
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#8B6F5E' }}>
            Please wait while we confirm your payment
          </p>
        </div>
      </RegistrationLayout>
    );
  }

  // Error state
  if (error || !result?.order) {
    return (
      <RegistrationLayout>
        <div className="max-w-xl mx-auto text-center py-24 px-4">
          <XCircle className="h-16 w-16 mx-auto mb-4" style={{ color: '#dc2626' }} />
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
            Something went wrong
          </h1>
          <p className="mb-6" style={{ color: '#8B6F5E' }}>
            {error || 'Unable to load your order details'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/events">Browse Events</Link>
            </Button>
            {slug && (
              <Button asChild style={{ backgroundColor: '#6B1D3A', color: '#fff' }}>
                <Link to={`/register/${slug}`}>Back to Event</Link>
              </Button>
            )}
          </div>
        </div>
      </RegistrationLayout>
    );
  }

  const order = result.order;
  const isCompleted = order.status === 'completed';

  return (
    <RegistrationLayout>
      <div className="max-w-[720px] mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-10">
          {isCompleted ? (
            <>
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: '#2D8B55' }}
              >
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
                Payment Confirmed!
              </h1>
              <p style={{ color: '#8B6F5E' }}>
                A receipt has been sent to{' '}
                <span className="font-medium" style={{ color: '#2D0A18' }}>
                  {order.email}
                </span>
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-16 w-16 mx-auto animate-spin mb-4" style={{ color: '#DFA51F' }} />
              <h1 className="text-3xl font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
                Processing your order...
              </h1>
              <p style={{ color: '#8B6F5E' }}>
                Your payment is being processed. Please don't close this page.
              </p>
            </>
          )}
        </div>

        {isCompleted && (
          <>
            {/* What's Next */}
            <Card className="mb-6 border-0 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
              <CardContent className="p-8">
                <h2 className="text-lg font-serif font-bold mb-5" style={{ color: '#2D0A18' }}>
                  What's Next
                </h2>
                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: '#DFA51F' }}
                    >
                      <Users className="h-4 w-4" style={{ color: '#2D0A18' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#2D0A18' }}>
                        1. Add Attendee Details
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#8B6F5E' }}>
                        You purchased {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''}.
                        Add the name and email for each attendee now or come back later.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: '#DFA51F' }}
                    >
                      <ListChecks className="h-4 w-4" style={{ color: '#2D0A18' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#2D0A18' }}>
                        2. Attendees Complete Registration
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#8B6F5E' }}>
                        Once you add their details, each attendee will receive an email with a
                        registration form to complete their information.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: '#DFA51F' }}
                    >
                      <QrCode className="h-4 w-4" style={{ color: '#2D0A18' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#2D0A18' }}>
                        3. Conference Details
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#8B6F5E' }}>
                        QR codes for check-in and additional event logistics will be sent
                        closer to the conference date.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How to come back */}
            <Card className="mb-8 border" style={{ borderColor: '#DFA51F', backgroundColor: '#FFFDF8' }}>
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#DFA51F' }} />
                  <div>
                    <p className="font-medium text-sm" style={{ color: '#2D0A18' }}>
                      Come back anytime
                    </p>
                    <p className="text-sm mt-1" style={{ color: '#8B6F5E' }}>
                      Click "Find My Order" and verify with your email. We'll send a one-time
                      code — no password needed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center">
              <Button
                asChild
                size="lg"
                className="px-8 py-6 text-base font-semibold rounded-xl"
                style={{ backgroundColor: '#DFA51F', color: '#2D0A18' }}
              >
                <Link to="/register/verify">
                  Add Attendee Details Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <p className="text-sm mt-3" style={{ color: '#8B6F5E' }}>
                Or come back anytime — just verify your email
              </p>
            </div>
          </>
        )}
      </div>
    </RegistrationLayout>
  );
}
