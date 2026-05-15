import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, SwitchCamera, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRScannerProps {
  onScan: (attendeeId: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  className?: string;
}

// Local error serializer
function serializeError(err: unknown): { name?: string; message: string } {
  if (err instanceof Error) return { name: err.name, message: err.message };
  if (typeof err === 'string') return { message: err };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

export function QRScanner({ onScan, onError, isActive, className }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanDetected, setScanDetected] = useState(false);
  const lastScanRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Serialization queue to prevent overlapping start/stop transitions
  const transitionRef = useRef<Promise<void>>(Promise.resolve());
  
  // Track if user has manually switched cameras
  const userSelectedCameraRef = useRef(false);
  
  // Stable callback refs to prevent scanner restarts
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Enqueue function to serialize all start/stop operations
  const enqueue = useCallback((fn: () => Promise<void>): Promise<void> => {
    transitionRef.current = transitionRef.current.then(fn, fn);
    return transitionRef.current;
  }, []);

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
        console.error('[QRScanner] Camera access error:', err);
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

  // Handle successful QR code scan
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      console.log('[QRScanner] Scan detected:', decodedText);
      
      // Prevent duplicate scans
      if (decodedText === lastScanRef.current) {
        return;
      }
      
      const attendeeId = extractAttendeeId(decodedText);
      
      if (attendeeId) {
        lastScanRef.current = decodedText;
        
        // Visual feedback - flash effect
        setScanDetected(true);
        
        // Use ref to call the latest onScan
        onScanRef.current(attendeeId);
        
        // Reset after cooldown
        if (scanCooldownRef.current) clearTimeout(scanCooldownRef.current);
        scanCooldownRef.current = setTimeout(() => {
          lastScanRef.current = null;
          setScanDetected(false);
        }, 3000);
      } else {
        onErrorRef.current?.('Invalid QR code format');
      }
    },
    [extractAttendeeId]
  );

  // Keep a stable ref to the scan handler for the scanner
  const handleScanRef = useRef(handleScanSuccess);
  useEffect(() => { handleScanRef.current = handleScanSuccess; }, [handleScanSuccess]);

  // Stop scanner helper (returns promise)
  const stopScanner = useCallback(async (): Promise<void> => {
    if (!scannerRef.current) return;
    
    try {
      const state = scannerRef.current.getState();
      console.log('[QRScanner] Stop requested, current state:', state);
      
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scannerRef.current.stop();
        console.log('[QRScanner] Stop success');
      }
    } catch (err) {
      // Ignore stop errors - scanner may already be stopped
      console.log('[QRScanner] Stop ignored (may already be stopped):', err);
    }
    
    // Small delay to allow camera resources to release
    await new Promise(resolve => setTimeout(resolve, 150));
    setIsScanning(false);
  }, []);

  // Start scanner helper (returns promise)
  const startScanner = useCallback(async (): Promise<void> => {
    if (!containerRef.current) {
      console.log('[QRScanner] No container ref, skipping start');
      return;
    }

    // Create scanner instance if needed
    if (!scannerRef.current) {
      console.log('[QRScanner] Creating new Html5Qrcode instance');
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    // Determine camera constraints - safe defaults
    let cameraConstraints: MediaTrackConstraints;
    
    if (userSelectedCameraRef.current && currentCamera) {
      // User explicitly switched cameras - use deviceId
      cameraConstraints = { deviceId: { exact: currentCamera } };
      console.log('[QRScanner] Using user-selected camera:', currentCamera);
    } else {
      // Default: prefer environment-facing camera (most compatible)
      cameraConstraints = { facingMode: 'environment' };
      console.log('[QRScanner] Using default facingMode: environment');
    }

    // Safe scan config - no qrbox (full frame), moderate FPS
    const scanConfig = {
      fps: 15,
      disableFlip: false,
      formatsToSupport: [0], // QR_CODE only
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    } as Parameters<typeof scannerRef.current.start>[1];

    console.log('[QRScanner] Start requested with config:', { cameraConstraints, scanConfig });

    try {
      await scannerRef.current.start(
        cameraConstraints,
        scanConfig,
        (decodedText: string) => handleScanRef.current(decodedText),
        () => {} // Ignore "no QR found" messages
      );
      
      console.log('[QRScanner] Start success');
      setIsScanning(true);
      setError(null);
    } catch (err) {
      const e = serializeError(err);
      console.error('[QRScanner] Start error:', e.name, e.message);
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to start camera';
      if (e.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied';
      } else if (e.name === 'NotFoundError') {
        userMessage = 'No camera found';
      } else if (e.name === 'OverconstrainedError') {
        userMessage = 'Camera not supported';
      } else if (e.message) {
        userMessage = e.message;
      }
      
      setError(userMessage);
      setIsScanning(false);
    }
  }, [currentCamera]);

  // Start/stop scanner based on isActive prop - serialized
  useEffect(() => {
    let mounted = true;

    if (isActive && hasPermission) {
      enqueue(async () => {
        if (!mounted) return;
        await stopScanner();
        if (!mounted) return;
        await startScanner();
      });
    } else {
      enqueue(async () => {
        if (!mounted) return;
        await stopScanner();
      });
    }

    return () => {
      mounted = false;
      enqueue(async () => {
        await stopScanner();
      });
    };
  }, [isActive, currentCamera, hasPermission, enqueue, stopScanner, startScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanCooldownRef.current) {
        clearTimeout(scanCooldownRef.current);
      }
    };
  }, []);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    userSelectedCameraRef.current = true;
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
        className={cn(
          "w-full aspect-square bg-muted rounded-lg overflow-hidden transition-all duration-150",
          scanDetected && "ring-4 ring-green-500 ring-opacity-75"
        )}
      />
      
      {/* Corner bracket guide overlay */}
      {isScanning && !scanDetected && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-3/4 aspect-square">
            {/* Top-left corner */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white/80 rounded-tl-lg" />
            {/* Top-right corner */}
            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white/80 rounded-tr-lg" />
            {/* Bottom-left corner */}
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white/80 rounded-bl-lg" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white/80 rounded-br-lg" />
          </div>
        </div>
      )}
      
      {/* Scan detected flash overlay */}
      {scanDetected && (
        <div className="absolute inset-0 bg-green-500/20 rounded-lg animate-pulse pointer-events-none" />
      )}
      
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

      {isScanning && !scanDetected && (
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
