import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Printer } from 'lucide-react';
import { useCallback, useRef } from 'react';

interface AttendeeQRCodeProps {
  attendeeId: string;
  attendeeName?: string;
  ticketType?: string;
  orderNumber?: string;
  baseUrl?: string;
  size?: number;
  showDownload?: boolean;
  showPrint?: boolean;
}

export function AttendeeQRCode({
  attendeeId,
  attendeeName,
  ticketType,
  orderNumber,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  size = 200,
  showDownload = true,
  showPrint = false,
}: AttendeeQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrValue = `${baseUrl}/events/checkin/${attendeeId}`;

  const handleDownload = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = size * 2; // 2x for better quality
      canvas.height = size * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-${attendeeName?.replace(/\s+/g, '-') || attendeeId}.png`;
      link.href = pngUrl;
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [attendeeId, attendeeName, size]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${attendeeName || 'Attendee'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            .name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .ticket-type {
              font-size: 16px;
              color: #666;
              margin-bottom: 4px;
            }
            .order-number {
              font-size: 14px;
              color: #999;
              margin-bottom: 20px;
            }
            svg {
              margin: 20px 0;
            }
            .instructions {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${attendeeName ? `<div class="name">${attendeeName}</div>` : ''}
            ${ticketType ? `<div class="ticket-type">${ticketType}</div>` : ''}
            ${orderNumber ? `<div class="order-number">Order: ${orderNumber}</div>` : ''}
            ${svgData}
            <div class="instructions">Scan this code at the event for check-in</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [attendeeName, ticketType, orderNumber]);

  return (
    <Card className="p-6 inline-block">
      <div className="text-center">
        {attendeeName && (
          <h4 className="font-semibold mb-1">{attendeeName}</h4>
        )}
        {ticketType && (
          <p className="text-sm text-muted-foreground mb-1">{ticketType}</p>
        )}
        {orderNumber && (
          <p className="text-xs text-muted-foreground mb-4">{orderNumber}</p>
        )}
        
        <div ref={qrRef} className="inline-block bg-white p-4 rounded-lg">
          <QRCodeSVG
            value={qrValue}
            size={size}
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-4 mb-4">
          Scan at event for check-in
        </p>

        {(showDownload || showPrint) && (
          <div className="flex gap-2 justify-center">
            {showDownload && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            {showPrint && (
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
