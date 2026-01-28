import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save } from 'lucide-react';
import { BadgePreview } from './BadgePreview';
import { BadgeFieldEditor } from './BadgeFieldEditor';
import { BadgeTemplateUpload } from './BadgeTemplateUpload';
import { toast } from 'sonner';
import type { BadgeField } from '@/hooks/useBadgeTemplates';
import {
  useBadgeTemplate,
  useCreateBadgeTemplate,
  useUpdateBadgeTemplate,
  useUploadBadgeBackground,
} from '@/hooks/useBadgeTemplates';

interface BadgeDesignerProps {
  eventId: string;
  eventName?: string;
  eventDate?: string;
  onSaved?: () => void;
}

const defaultFields: BadgeField[] = [
  {
    id: 'name',
    label: 'Attendee Name',
    x: 1.5,
    y: 2.0,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    align: 'center',
    source: 'attendee_name',
  },
  {
    id: 'ticket',
    label: 'Ticket Type',
    x: 1.5,
    y: 2.5,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666666',
    align: 'center',
    source: 'ticket_type',
  },
];

export function BadgeDesigner({ eventId, eventName, eventDate, onSaved }: BadgeDesignerProps) {
  const { data: existingTemplate, isLoading } = useBadgeTemplate(eventId);
  const createTemplate = useCreateBadgeTemplate();
  const updateTemplate = useUpdateBadgeTemplate();
  const uploadBackground = useUploadBadgeBackground();

  const [fields, setFields] = useState<BadgeField[]>(defaultFields);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (existingTemplate) {
      setFields(existingTemplate.fields.length > 0 ? existingTemplate.fields : defaultFields);
      setBackgroundImageUrl(existingTemplate.background_image_url);
    }
  }, [existingTemplate]);

  const handleFieldChange = (updatedField: BadgeField) => {
    setFields((prev) =>
      prev.map((f) => (f.id === updatedField.id ? updatedField : f))
    );
    setHasChanges(true);
  };

  const handleFieldDelete = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setHasChanges(true);
  };

  const handleAddField = () => {
    const newField: BadgeField = {
      id: `field-${Date.now()}`,
      label: 'New Field',
      x: 1.5,
      y: 1.0,
      fontSize: 14,
      fontWeight: 'normal',
      color: '#000000',
      align: 'center',
      source: 'attendee_name',
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setHasChanges(true);
  };

  const handleBackgroundUpload = async (file: File) => {
    try {
      const url = await uploadBackground.mutateAsync({ eventId, file });
      setBackgroundImageUrl(url);
      setHasChanges(true);
      toast.success('Background uploaded');
    } catch (error) {
      toast.error('Failed to upload background');
    }
  };

  const handleBackgroundRemove = () => {
    setBackgroundImageUrl(null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (existingTemplate) {
        await updateTemplate.mutateAsync({
          id: existingTemplate.id,
          eventId,
          fields,
          backgroundImageUrl,
        });
      } else {
        await createTemplate.mutateAsync({
          eventId,
          fields,
          backgroundImageUrl,
        });
      }
      setHasChanges(false);
      toast.success('Badge template saved');
      onSaved?.();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const sampleData = {
    attendee_name: 'John Smith',
    attendee_email: 'john@example.com',
    ticket_type: 'VIP Access',
    order_number: 'ORD-20250128-0001',
    purchaser_name: 'John Smith',
    event_name: eventName || 'Annual Conference 2025',
    event_date: eventDate || 'January 28, 2025',
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preview Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Badge Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <BadgePreview
            fields={fields}
            backgroundImageUrl={backgroundImageUrl}
            sampleData={sampleData}
            scale={1}
            selectedFieldId={selectedFieldId}
            onFieldClick={setSelectedFieldId}
          />
          <p className="text-xs text-muted-foreground text-center">
            Click on a field to select and edit it. Badge size: 3" × 4"
          </p>
        </CardContent>
      </Card>

      {/* Editor Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Background Image</CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeTemplateUpload
              currentImageUrl={backgroundImageUrl}
              onUpload={handleBackgroundUpload}
              onRemove={handleBackgroundRemove}
              isUploading={uploadBackground.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Text Fields</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddField}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {fields.map((field) => (
              <div
                key={field.id}
                className={selectedFieldId === field.id ? 'ring-2 ring-primary rounded-lg' : ''}
                onClick={() => setSelectedFieldId(field.id)}
              >
                <BadgeFieldEditor
                  field={field}
                  onChange={handleFieldChange}
                  onDelete={() => handleFieldDelete(field.id)}
                />
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No fields added. Click "Add Field" to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={createTemplate.isPending || updateTemplate.isPending}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
}
