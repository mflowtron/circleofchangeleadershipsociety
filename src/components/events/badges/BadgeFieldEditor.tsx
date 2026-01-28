import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { BadgeField } from '@/hooks/useBadgeTemplates';

interface BadgeFieldEditorProps {
  field: BadgeField;
  onChange: (field: BadgeField) => void;
  onDelete: () => void;
}

const sourceOptions: { value: BadgeField['source']; label: string }[] = [
  { value: 'attendee_name', label: 'Attendee Name' },
  { value: 'attendee_email', label: 'Attendee Email' },
  { value: 'ticket_type', label: 'Ticket Type' },
  { value: 'order_number', label: 'Order Number' },
  { value: 'purchaser_name', label: 'Purchaser Name' },
  { value: 'event_name', label: 'Event Name' },
  { value: 'event_date', label: 'Event Date' },
];

export function BadgeFieldEditor({ field, onChange, onDelete }: BadgeFieldEditorProps) {
  const updateField = (updates: Partial<BadgeField>) => {
    onChange({ ...field, ...updates });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{field.label}</h4>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Data Source</Label>
          <Select
            value={field.source}
            onValueChange={(value) => updateField({ source: value as BadgeField['source'] })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            min={8}
            max={72}
            value={field.fontSize}
            onChange={(e) => updateField({ fontSize: parseInt(e.target.value) || 14 })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">X Position (inches)</Label>
          <Input
            type="number"
            step={0.1}
            min={0}
            max={3}
            value={field.x}
            onChange={(e) => updateField({ x: parseFloat(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Y Position (inches)</Label>
          <Input
            type="number"
            step={0.1}
            min={0}
            max={4}
            value={field.y}
            onChange={(e) => updateField({ y: parseFloat(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Alignment</Label>
          <Select
            value={field.align}
            onValueChange={(value) => updateField({ align: value as BadgeField['align'] })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={field.fontWeight}
            onValueChange={(value) => updateField({ fontWeight: value as BadgeField['fontWeight'] })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={field.color}
              onChange={(e) => updateField({ color: e.target.value })}
              className="h-8 w-12 p-1"
            />
            <Input
              type="text"
              value={field.color}
              onChange={(e) => updateField({ color: e.target.value })}
              className="h-8 text-sm flex-1"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
