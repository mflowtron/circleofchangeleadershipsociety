import { cn } from '@/lib/utils';
import type { BadgeField, BadgeOrientation } from '@/hooks/useBadgeTemplates';
import type { AttendeeData } from '@/lib/badgePdfGenerator';

interface BadgePreviewProps {
  fields: BadgeField[];
  backgroundImageUrl?: string | null;
  sampleData?: AttendeeData;
  scale?: number;
  className?: string;
  onFieldClick?: (fieldId: string) => void;
  selectedFieldId?: string | null;
  orientation?: BadgeOrientation;
}

// Badge dimensions at 100px per inch
const PORTRAIT_WIDTH = 300;  // 3"
const PORTRAIT_HEIGHT = 400; // 4"
const LANDSCAPE_WIDTH = 400; // 4"
const LANDSCAPE_HEIGHT = 300; // 3"
const PX_PER_INCH = 100;

const defaultSampleData: AttendeeData = {
  attendee_name: 'John Smith',
  attendee_email: 'john.smith@example.com',
  ticket_type: 'VIP Access',
  order_number: 'ORD-20250128-0001',
  purchaser_name: 'John Smith',
  event_name: 'Annual Conference 2025',
  event_date: 'January 28, 2025',
};

export function BadgePreview({
  fields,
  backgroundImageUrl,
  sampleData = defaultSampleData,
  scale = 1,
  className,
  onFieldClick,
  selectedFieldId,
  orientation = 'landscape',
}: BadgePreviewProps) {
  const baseWidth = orientation === 'landscape' ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH;
  const baseHeight = orientation === 'landscape' ? LANDSCAPE_HEIGHT : PORTRAIT_HEIGHT;
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  const getFieldValue = (source: BadgeField['source']): string => {
    return sampleData[source] || '';
  };

  return (
    <div
      className={cn(
        'relative bg-muted border border-border rounded-sm overflow-hidden',
        className
      )}
      style={{ width, height }}
    >
      {backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt="Badge background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      {fields.map((field) => {
        const value = getFieldValue(field.source);
        const left = field.x * PX_PER_INCH * scale;
        const top = field.y * PX_PER_INCH * scale;
        const isSelected = selectedFieldId === field.id;
        
        let textAlign: 'left' | 'center' | 'right' = field.align;
        let transform = '';
        
        if (field.align === 'center') {
          transform = 'translateX(-50%)';
        } else if (field.align === 'right') {
          transform = 'translateX(-100%)';
        }

        return (
          <div
            key={field.id}
            className={cn(
              'absolute cursor-pointer transition-all',
              isSelected && 'ring-2 ring-primary ring-offset-1',
              onFieldClick && 'hover:ring-2 hover:ring-primary/50'
            )}
            style={{
              left,
              top,
              fontSize: field.fontSize * scale,
              fontWeight: field.fontWeight,
              color: field.color,
              textAlign,
              transform,
              whiteSpace: 'nowrap',
            }}
            onClick={() => onFieldClick?.(field.id)}
          >
            {value || `[${field.label}]`}
          </div>
        );
      })}
    </div>
  );
}
