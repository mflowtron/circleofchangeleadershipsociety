import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, SwitchCamera, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRScannerProps {
  onScan: (attendeeId: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  className?: string;
}

export function QRScanner({ onScan, onError, isActive, className }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera list
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices.map((d) => ({ id: d.id, label: d.label })));
          // Prefer back camera
          const backCamera = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          setCurrentCamera(backCamera?.id || devices[0].id);
          setHasPermission(true);
        } else {
          setError('No cameras found');
          setHasPermission(false);
        }
      })
      .catch((err) => {
        console.error('Camera access error:', err);
        setError('Camera permission denied');
        setHasPermission(false);
      });
  }, []);

  // Extract attendee ID from QR code content
  const extractAttendeeId = useCallback((qrContent: string): string | null => {
    // Try to match URL format: .../events/checkin/{attendee_id}
    const urlMatch = qrContent.match(/\/events\/checkin\/([a-f0-9-]+)/i);
    if (urlMatch) return urlMatch[1];

    // Try to match raw UUID format
    const uuidMatch = qrContent.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    if (uuidMatch) return qrContent;

    return null;
  }, []);

  const handleScan = useCallback(
    (decodedText: string) => {
      // Prevent duplicate scans
      if (decodedText === lastScanRef.current) return;
      
      const attendeeId = extractAttendeeId(decodedText);
      if (attendeeId) {
        lastScanRef.current = decodedText;
        onScan(attendeeId);
        
        // Reset after cooldown
        if (scanCooldownRef.current) clearTimeout(scanCooldownRef.current);
        scanCooldownRef.current = setTimeout(() => {
          lastScanRef.current = null;
        }, 3000);
      } else {
        onError?.('Invalid QR code format');
      }
    },
    [onScan, onError, extractAttendeeId]
  );

  // Start/stop scanner based on isActive prop
  useEffect(() => {
    const startScanner = async () => {
      if (!currentCamera || !containerRef.current) return;

      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-reader');
        }

        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }

        await scannerRef.current.start(
          currentCamera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          handleScan,
          () => {} // Ignore errors during scanning (e.g., no QR found)
        );
        setIsScanning(true);
        setError(null);
      } catch (err) {
        console.error('Scanner start error:', err);
        setError('Failed to start camera');
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            await scannerRef.current.stop();
          }
        } catch (err) {
          console.error('Scanner stop error:', err);
        }
        setIsScanning(false);
      }
    };

    if (isActive && currentCamera && hasPermission) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, currentCamera, hasPermission, handleScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanCooldownRef.current) {
        clearTimeout(scanCooldownRef.current);
      }
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            scannerRef.current.stop();
          }
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === currentCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setCurrentCamera(cameras[nextIndex].id);
  };

  if (hasPermission === false) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 p-8 bg-muted rounded-lg', className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-center text-muted-foreground">
          Camera access is required to scan QR codes.
          <br />
          Please enable camera permissions and refresh.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div
        id="qr-reader"
        className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <div className="text-center p-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {!isScanning && !error && hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        </div>
      )}

      {cameras.length > 1 && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 left-4"
          onClick={switchCamera}
        >
          <SwitchCamera className="h-4 w-4 mr-2" />
          Switch
        </Button>
      )}

      {isScanning && (
        <div className="absolute bottom-4 right-4">
          <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-full text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Scanning...
          </div>
        </div>
      )}
    </div>
  );
}
