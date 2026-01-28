import { jsPDF } from 'jspdf';
import type { BadgeField } from '@/hooks/useBadgeTemplates';

// AVERY 5392 dimensions in points (72 points per inch)
const PAGE_WIDTH = 612;  // 8.5"
const PAGE_HEIGHT = 792; // 11"
const BADGE_WIDTH = 216; // 3"
const BADGE_HEIGHT = 288; // 4"
const TOP_MARGIN = 50;   // ~0.69"
const LEFT_MARGIN = 54;  // ~0.75"
const H_GAP = 14;        // ~0.19" between columns
const V_GAP = 0;         // No vertical gap

const COLS = 2;
const ROWS = 3;
const BADGES_PER_PAGE = COLS * ROWS;

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

function getBadgePosition(index: number): { x: number; y: number } {
  const col = index % COLS;
  const row = Math.floor(index / COLS) % ROWS;
  
  const x = LEFT_MARGIN + col * (BADGE_WIDTH + H_GAP);
  const y = TOP_MARGIN + row * (BADGE_HEIGHT + V_GAP);
  
  return { x, y };
}

async function loadImage(url: string): Promise<string> {
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
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export async function generateBadgePdf(
  attendees: AttendeeData[],
  fields: BadgeField[],
  backgroundImageUrl?: string | null
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let backgroundDataUrl: string | null = null;
  if (backgroundImageUrl) {
    try {
      backgroundDataUrl = await loadImage(backgroundImageUrl);
    } catch (e) {
      console.warn('Failed to load background image:', e);
    }
  }

  const totalPages = Math.ceil(attendees.length / BADGES_PER_PAGE);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    const startIdx = pageIndex * BADGES_PER_PAGE;
    const endIdx = Math.min(startIdx + BADGES_PER_PAGE, attendees.length);

    for (let i = startIdx; i < endIdx; i++) {
      const attendee = attendees[i];
      const badgeIndex = i - startIdx;
      const { x, y } = getBadgePosition(badgeIndex);

      // Draw background image if available
      if (backgroundDataUrl) {
        doc.addImage(backgroundDataUrl, 'JPEG', x, y, BADGE_WIDTH, BADGE_HEIGHT);
      } else {
        // Draw a light border if no background
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT);
      }

      // Draw text fields
      for (const field of fields) {
        const text = getFieldValue(attendee, field.source);
        if (!text) continue;

        // Convert inches to points for positioning within badge
        const textX = x + field.x * 72;
        const textY = y + field.y * 72;

        doc.setFontSize(field.fontSize);
        doc.setTextColor(field.color);
        
        if (field.fontWeight === 'bold') {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        let alignX = textX;
        let align: 'left' | 'center' | 'right' = field.align;
        
        if (field.align === 'center') {
          alignX = x + BADGE_WIDTH / 2;
        } else if (field.align === 'right') {
          alignX = x + BADGE_WIDTH - (field.x * 72);
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
