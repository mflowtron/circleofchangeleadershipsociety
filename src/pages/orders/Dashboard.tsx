import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderPortal, PortalOrder } from '@/hooks/useOrderPortal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CircleLoader } from '@/components/ui/circle-loader';
import { OrderCard } from '@/components/orders/OrderCard';
import { LogOut, RefreshCw, Package } from 'lucide-react';

export default function OrderPortalDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, email, orders, loading, error, fetchOrders, sendMessage, logout } = useOrderPortal();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/my-orders');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/my-orders');
  };

  if (!isAuthenticated) {
    return null;
  }

  const totalUnreadMessages = orders.reduce((sum, order) => sum + order.unread_messages, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">My Orders</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <CircleLoader size="lg" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => fetchOrders()}>Try Again</Button>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No Orders Found</h2>
              <p className="text-muted-foreground">
                We couldn't find any orders associated with this email.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            {totalUnreadMessages > 0 && (
              <Card className="border-primary">
                <CardContent className="py-3">
                  <p className="text-sm">
                    You have <Badge variant="default">{totalUnreadMessages}</Badge> unread message{totalUnreadMessages !== 1 ? 's' : ''} from event organizers
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Orders List */}
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onSendMessage={sendMessage} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
