import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  attendeeId: string;
  attendeeName: string | null;
  ticketType?: string;
}

export function QRCodeDisplay({ 
  attendeeId, 
  attendeeName,
  ticketType,
}: QRCodeDisplayProps) {
  const { toast } = useToast();
  
  const baseUrl = window.location.origin;
  const qrValue = `${baseUrl}/events/checkin/${attendeeId}`;
  
  const handleDownload = () => {
    const svg = document.getElementById('attendee-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      
      // White background
      ctx!.fillStyle = 'white';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      
      // Center the QR code
      ctx!.drawImage(img, 50, 50, 500, 500);
      
      const link = document.createElement('a');
      link.download = `qr-code-${attendeeName?.replace(/\s+/g, '-') || attendeeId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Event QR Code',
          text: `Check-in QR code for ${attendeeName || 'Attendee'}`,
          url: qrValue,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          toast({
            title: "Couldn't share",
            description: "Try downloading the QR code instead.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(qrValue);
        toast({
          title: "Link copied!",
          description: "The check-in link has been copied to your clipboard.",
        });
      } catch {
        toast({
          title: "Couldn't copy",
          description: "Please try downloading the QR code instead.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code Card */}
      <Card className="bg-white">
        <CardContent className="p-6">
          <QRCodeSVG
            id="attendee-qr-code"
            value={qrValue}
            size={280}
            level="H"
            includeMargin
            className="mx-auto"
          />
        </CardContent>
      </Card>

      {/* Attendee Info */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">
          {attendeeName || 'Attendee'}
        </h2>
        {ticketType && (
          <p className="text-muted-foreground">{ticketType}</p>
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Show this QR code at the registration desk to check in
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button variant="outline" onClick={handleShare} className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  );
}
