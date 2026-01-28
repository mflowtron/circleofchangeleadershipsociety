import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import logo from '@/assets/coclc-logo.png';

export default function PendingApproval() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Circle of Change" className="h-16" />
          </div>
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Clock className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}! Your account is currently awaiting administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            An administrator will review your registration and assign you to the appropriate chapter. 
            You'll receive access once your account has been approved.
          </p>
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={signOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
