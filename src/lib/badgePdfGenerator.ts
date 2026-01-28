import { jsPDF } from 'jspdf';
import type { BadgeField, BadgeOrientation } from '@/hooks/useBadgeTemplates';

// AVERY 5392 dimensions in points (72 points per inch)
const POINTS_PER_INCH = 72;
const PREVIEW_PX_PER_INCH = 100; // Must match BadgePreview.tsx

// Portrait: 3" wide x 4" tall
const PORTRAIT_WIDTH = 3 * POINTS_PER_INCH;  // 216pt
const PORTRAIT_HEIGHT = 4 * POINTS_PER_INCH; // 288pt

// Landscape: 4" wide x 3" tall
const LANDSCAPE_WIDTH = 4 * POINTS_PER_INCH;  // 288pt
const LANDSCAPE_HEIGHT = 3 * POINTS_PER_INCH; // 216pt

const TOP_MARGIN = 50;   // ~0.69"
const LEFT_MARGIN = 54;  // ~0.75"
const H_GAP = 14;        // ~0.19" between columns

// Scale factor to convert preview pixels to PDF points
// Preview uses 100px per inch, PDF uses 72pt per inch
const PREVIEW_TO_PDF_SCALE = POINTS_PER_INCH / PREVIEW_PX_PER_INCH;

export interface AttendeeData {
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type: string | null;
  order_number: string | null;
  purchaser_name: string | null;
  event_name: string | null;
  event_date: string | null;
}

function getFieldValue(attendee: AttendeeData, source: BadgeField['source']): string {
  const value = attendee[source];
  return value || '';
}

function getBadgePosition(
  index: number, 
  orientation: BadgeOrientation
): { x: number; y: number } {
  const badgeWidth = orientation === 'landscape' ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH;
  const badgeHeight = orientation === 'landscape' ? LANDSCAPE_HEIGHT : PORTRAIT_HEIGHT;
  
  // Calculate grid layout based on orientation
  const cols = orientation === 'landscape' ? 2 : 2;
  const rows = orientation === 'landscape' ? 3 : 3;
  
  const col = index % cols;
  const row = Math.floor(index / cols) % rows;
  
  const x = LEFT_MARGIN + col * (badgeWidth + H_GAP);
  const y = TOP_MARGIN + row * badgeHeight;
  
  return { x, y };
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

async function loadImage(url: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// Calculate dimensions to "cover" the target area (like CSS object-fit: cover)
function calculateCoverDimensions(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { width: number; height: number; x: number; y: number } {
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;

  let width: number;
  let height: number;

  if (imgAspect > targetAspect) {
    // Image is wider than target - fit by height, crop width
    height = targetHeight;
    width = targetHeight * imgAspect;
  } else {
    // Image is taller than target - fit by width, crop height
    width = targetWidth;
    height = targetWidth / imgAspect;
  }

  // Center the image
  const x = (targetWidth - width) / 2;
  const y = (targetHeight - height) / 2;

  return { width, height, x, y };
}

export async function generateBadgePdf(
  attendees: AttendeeData[],
  fields: BadgeField[],
  backgroundImageUrl?: string | null,
  orientation: BadgeOrientation = 'landscape'
): Promise<Blob> {
  const badgeWidth = orientation === 'landscape' ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH;
  const badgeHeight = orientation === 'landscape' ? LANDSCAPE_HEIGHT : PORTRAIT_HEIGHT;
  const badgesPerPage = 6; // 2 cols x 3 rows for both orientations

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let backgroundImage: LoadedImage | null = null;
  if (backgroundImageUrl) {
    try {
      backgroundImage = await loadImage(backgroundImageUrl);
    } catch (e) {
      console.warn('Failed to load background image:', e);
    }
  }

  const totalPages = Math.ceil(attendees.length / badgesPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    const startIdx = pageIndex * badgesPerPage;
    const endIdx = Math.min(startIdx + badgesPerPage, attendees.length);

    for (let i = startIdx; i < endIdx; i++) {
      const attendee = attendees[i];
      const badgeIndex = i - startIdx;
      const { x, y } = getBadgePosition(badgeIndex, orientation);

      // Draw background image if available (using cover/crop behavior)
      if (backgroundImage) {
        // Save graphics state and create clipping region for the badge
        doc.saveGraphicsState();
        
        // Create clipping rectangle for the badge area
        doc.rect(x, y, badgeWidth, badgeHeight);
        // @ts-ignore - clip() exists in jsPDF but types may be incomplete
        doc.clip();
        
        // Calculate cover dimensions to fill badge while maintaining aspect ratio
        const cover = calculateCoverDimensions(
          backgroundImage.width,
          backgroundImage.height,
          badgeWidth,
          badgeHeight
        );
        
        // Draw the image with calculated dimensions (will be clipped to badge area)
        doc.addImage(
          backgroundImage.dataUrl,
          'JPEG',
          x + cover.x,
          y + cover.y,
          cover.width,
          cover.height
        );
        
        // Restore graphics state
        doc.restoreGraphicsState();
      } else {
        // Draw a light border if no background
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(x, y, badgeWidth, badgeHeight);
      }

      // Draw text fields
      for (const field of fields) {
        const text = getFieldValue(attendee, field.source);
        if (!text) continue;

        // Convert field position (in inches from preview) to PDF points
        const textX = x + field.x * POINTS_PER_INCH;
        const textY = y + field.y * POINTS_PER_INCH;

        // Scale font size from preview pixels to PDF points
        // Preview uses pixels for fontSize, PDF needs points
        const scaledFontSize = field.fontSize * PREVIEW_TO_PDF_SCALE;
        doc.setFontSize(scaledFontSize);
        doc.setTextColor(field.color);
        
        if (field.fontWeight === 'bold') {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        let alignX = textX;
        let align: 'left' | 'center' | 'right' = field.align;
        
        if (field.align === 'center') {
          alignX = x + badgeWidth / 2;
        } else if (field.align === 'right') {
          alignX = x + badgeWidth - (field.x * POINTS_PER_INCH);
        }

        doc.text(text, alignX, textY, { align });
      }
    }
  }

  return doc.output('blob');
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
