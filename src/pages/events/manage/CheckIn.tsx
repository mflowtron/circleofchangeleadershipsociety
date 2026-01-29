import { useState, useCallback } from 'react';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QRScanner } from '@/components/events/checkin/QRScanner';
import { CheckInResult } from '@/components/events/checkin/CheckInResult';
import { ManualCheckIn } from '@/components/events/checkin/ManualCheckIn';
import { CheckInStats } from '@/components/events/checkin/CheckInStats';
import { CheckInActivityFeed } from '@/components/events/checkin/CheckInActivityFeed';
import { useAttendeeById, useCheckIn, useAttendeeCheckInStatus } from '@/hooks/useCheckins';
import { ScanLine, Search, BarChart3, CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ScanStatus = 'idle' | 'loading' | 'success' | 'already_checked_in' | 'error' | 'wrong_event';

export default function CheckIn() {
  const { selectedEventId, hasSelection } = useEventSelection();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'stats'>('scan');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scannedAttendeeId, setScannedAttendeeId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isScannerActive, setIsScannerActive] = useState(true);

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const { data: scannedAttendee, isLoading: loadingAttendee } = useAttendeeById(scannedAttendeeId || undefined);
  const { data: existingCheckIn } = useAttendeeCheckInStatus(
    scannedAttendeeId || undefined,
    selectedEventId || undefined,
    dateString
  );
  const checkIn = useCheckIn();

  const handleScan = useCallback((attendeeId: string) => {
    setScannedAttendeeId(attendeeId);
    setScanStatus('loading');
    setIsScannerActive(false);
  }, []);

  const handleScanError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  // Update status when attendee data loads
  const updateStatusFromAttendee = useCallback(() => {
    if (!scannedAttendeeId) return;
    
    if (loadingAttendee) {
      setScanStatus('loading');
      return;
    }

    if (!scannedAttendee) {
      setScanStatus('error');
      setErrorMessage('Attendee not found');
      return;
    }

    // Check if attendee belongs to current event
    const attendeeEventId = scannedAttendee.order?.event_id;
    if (attendeeEventId && attendeeEventId !== selectedEventId) {
      setScanStatus('wrong_event');
      return;
    }

    // Check if already checked in
    if (existingCheckIn) {
      setScanStatus('already_checked_in');
      return;
    }

    setScanStatus('idle');
  }, [scannedAttendeeId, loadingAttendee, scannedAttendee, selectedEventId, existingCheckIn]);

  // Effect to update status when data changes
  useState(() => {
    if (scannedAttendeeId && !loadingAttendee) {
      updateStatusFromAttendee();
    }
  });

  // Watch for attendee data changes
  if (scannedAttendeeId && scanStatus === 'loading' && !loadingAttendee && scannedAttendee !== undefined) {
    updateStatusFromAttendee();
  }

  const handleCheckIn = async () => {
    if (!scannedAttendeeId || !selectedEventId) return;

    try {
      await checkIn.mutateAsync({
        attendeeId: scannedAttendeeId,
        eventId: selectedEventId,
        date: dateString,
      });
      setScanStatus('success');
      toast.success('Check-in successful!');
    } catch (error: any) {
      if (error.message === 'Already checked in for today') {
        setScanStatus('already_checked_in');
      } else {
        setScanStatus('error');
        setErrorMessage(error.message || 'Failed to check in');
        toast.error('Check-in failed');
      }
    }
  };

  const handleScanNext = () => {
    setScannedAttendeeId(null);
    setScanStatus('idle');
    setErrorMessage('');
    setIsScannerActive(true);
  };

  if (!hasSelection) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Event Selected</h2>
          <p className="text-muted-foreground">
            Please select an event from the sidebar to start checking in attendees.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="h-6 w-6" />
            Check-In
          </h1>
          <p className="text-muted-foreground">Scan QR codes or search to check in attendees</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="scan" className="gap-2">
            <ScanLine className="h-4 w-4" />
            Scan
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Search className="h-4 w-4" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scanner */}
            <div>
              {scannedAttendeeId ? (
                <CheckInResult
                  status={scanStatus}
                  attendee={scannedAttendee || null}
                  existingCheckInTime={existingCheckIn?.checked_in_at}
                  errorMessage={errorMessage}
                  onCheckIn={handleCheckIn}
                  onScanNext={handleScanNext}
                  isCheckingIn={checkIn.isPending}
                />
              ) : (
                <QRScanner
                  onScan={handleScan}
                  onError={handleScanError}
                  isActive={isScannerActive && activeTab === 'scan'}
                  className="w-full max-w-md mx-auto"
                />
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <h3 className="font-semibold mb-3">Today's Activity</h3>
              <CheckInActivityFeed eventId={selectedEventId!} date={dateString} limit={8} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <ManualCheckIn 
            eventId={selectedEventId!} 
            date={dateString}
            onCheckInComplete={() => {}}
          />
        </TabsContent>

        <TabsContent value="stats">
          <CheckInStats eventId={selectedEventId!} date={dateString} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
