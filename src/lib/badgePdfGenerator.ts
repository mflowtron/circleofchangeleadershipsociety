import { jsPDF } from 'jspdf';
import type { BadgeField, BadgeOrientation } from '@/hooks/useBadgeTemplates';

// AVERY 5392 specifications (official measurements)
// Sheet: 8.5" × 11" (Letter)
// Labels: 6 per sheet (2 columns × 3 rows)
// Each label: 4" wide × 3" tall

const POINTS_PER_INCH = 72;

// Badge dimensions in points
const BADGE_WIDTH_INCHES = 4;
const BADGE_HEIGHT_INCHES = 3;
const PORTRAIT_WIDTH = BADGE_HEIGHT_INCHES * POINTS_PER_INCH;   // 3" = 216pt
const PORTRAIT_HEIGHT = BADGE_WIDTH_INCHES * POINTS_PER_INCH;   // 4" = 288pt
const LANDSCAPE_WIDTH = BADGE_WIDTH_INCHES * POINTS_PER_INCH;   // 4" = 288pt
const LANDSCAPE_HEIGHT = BADGE_HEIGHT_INCHES * POINTS_PER_INCH; // 3" = 216pt

// AVERY 5392 precise margins (derived from official template)
// Sheet: 8.5" wide, 2 badges at 4" each = 8", leaves 0.5" total
// Gap between columns: 0.125", margins: (0.5" - 0.125") / 2 = 0.1875" each side
const LEFT_MARGIN_INCHES = 0.25;  // ~0.25" left margin
const TOP_MARGIN_INCHES = 1.0;    // ~1" top margin
const H_GAP_INCHES = 0;           // No horizontal gap (badges adjacent)

const LEFT_MARGIN = LEFT_MARGIN_INCHES * POINTS_PER_INCH;  // 18pt
const TOP_MARGIN = TOP_MARGIN_INCHES * POINTS_PER_INCH;    // 72pt
const H_GAP = H_GAP_INCHES * POINTS_PER_INCH;              // 0pt

// Preview uses 100px per inch for display
const PREVIEW_PX_PER_INCH = 100;

// Scale factor to convert preview measurements to PDF points
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
  element: HTMLImageElement;
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
        element: img,
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// Render a background image to an exact badge-size JPEG using "cover" (crop, no distortion).
// This avoids relying on PDF clipping (which can be inconsistent across viewers).
function renderCoverImageToDataUrl(
  img: HTMLImageElement,
  badgeWidthPt: number,
  badgeHeightPt: number,
  exportPxPerInch = 300
): string {
  const widthIn = badgeWidthPt / POINTS_PER_INCH;
  const heightIn = badgeHeightPt / POINTS_PER_INCH;
  const targetW = Math.round(widthIn * exportPxPerInch);
  const targetH = Math.round(heightIn * exportPxPerInch);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const imgAspect = img.width / img.height;
  const targetAspect = targetW / targetH;

  // Compute source crop rect (sx, sy, sw, sh) to cover the target
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgAspect > targetAspect) {
    // Wider than target: crop left/right
    sh = img.height;
    sw = Math.round(img.height * targetAspect);
    sx = Math.round((img.width - sw) / 2);
  } else {
    // Taller than target: crop top/bottom
    sw = img.width;
    sh = Math.round(img.width / targetAspect);
    sy = Math.round((img.height - sh) / 2);
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', 0.92);
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

  // Pre-render cropped background once (badge dimensions are constant per template)
  let backgroundCoverDataUrl: string | null = null;
  if (backgroundImage) {
    try {
      backgroundCoverDataUrl = renderCoverImageToDataUrl(
        backgroundImage.element,
        badgeWidth,
        badgeHeight
      );
    } catch (e) {
      console.warn('Failed to render background cover image:', e);
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

      // Draw background image if available (pre-cropped to badge bounds)
      if (backgroundCoverDataUrl) {
        doc.addImage(backgroundCoverDataUrl, 'JPEG', x, y, badgeWidth, badgeHeight);
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

        // Convert field position from inches to PDF points
        // field.x and field.y are stored in inches
        const textX = x + field.x * POINTS_PER_INCH;
        const textY = y + field.y * POINTS_PER_INCH;

        // Font size scaling:
        // In the preview, fontSize is in CSS pixels displayed on a badge that is
        // PREVIEW_PX_PER_INCH pixels per inch (400px for 4" badge).
        // In the PDF, we need the same proportional size.
        // PDF uses points (72 per inch), so we scale: fontSize * (72/100)
        const scaledFontSize = field.fontSize * PREVIEW_TO_PDF_SCALE;
        
        doc.setFontSize(scaledFontSize);
        doc.setTextColor(field.color);
        
        if (field.fontWeight === 'bold') {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        // Handle text alignment
        let alignX = textX;
        const align: 'left' | 'center' | 'right' = field.align;
        
        if (field.align === 'center') {
          // For center alignment, position at badge center
          alignX = x + badgeWidth / 2;
        } else if (field.align === 'right') {
          // For right alignment, position at badge right edge minus X offset
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
