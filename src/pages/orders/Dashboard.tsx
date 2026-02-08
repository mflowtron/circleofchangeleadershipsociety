import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CircleLoader } from '@/components/ui/circle-loader';
import { OrderCard } from '@/components/orders/OrderCard';
import { LogOut, RefreshCw, Package, Smartphone } from 'lucide-react';

export default function OrderPortalDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, email, orders, loading, error, fetchOrders, logout } = useOrderPortal();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!isAuthenticated) {
    return null;
  }

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
            <Link to="/attendee/app/home">
              <Button variant="default" size="sm" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Event App
              </Button>
            </Link>
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
            {/* Orders List */}
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
