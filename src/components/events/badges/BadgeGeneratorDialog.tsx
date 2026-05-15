import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Settings2 } from 'lucide-react';
import { BadgeDesigner } from './BadgeDesigner';
import { BadgePreview } from './BadgePreview';
import { useBadgeTemplate } from '@/hooks/useBadgeTemplates';
import { generateBadgePdf, downloadPdf, type AttendeeData } from '@/lib/badgePdfGenerator';
import { toast } from 'sonner';

interface Attendee {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type?: { name: string } | null;
  order?: {
    order_number: string;
    full_name: string;
    event_id?: string;
  } | null;
}

interface TicketType {
  id: string;
  name: string;
}

interface BadgeGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  eventDate: string;
  attendees: Attendee[];
  ticketTypes: TicketType[];
}

export function BadgeGeneratorDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  eventDate,
  attendees,
  ticketTypes,
}: BadgeGeneratorDialogProps) {
  const { data: template, isLoading } = useBadgeTemplate(eventId);
  const [activeTab, setActiveTab] = useState<'generate' | 'design'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filters
  const [selectedTicketType, setSelectedTicketType] = useState<string>('all');
  const [completeOnly, setCompleteOnly] = useState(true);

  const filteredAttendees = attendees.filter((a) => {
    if (completeOnly && (!a.attendee_name || !a.attendee_email)) {
      return false;
    }
    if (selectedTicketType !== 'all' && a.ticket_type?.name !== selectedTicketType) {
      return false;
    }
    return true;
  });

  const handleGenerate = async () => {
    if (!template) {
      toast.error('Please create a badge template first');
      setActiveTab('design');
      return;
    }

    if (filteredAttendees.length === 0) {
      toast.error('No attendees match your filters');
      return;
    }

    setIsGenerating(true);
    try {
      const attendeeData: AttendeeData[] = filteredAttendees.map((a) => ({
        attendee_name: a.attendee_name,
        attendee_email: a.attendee_email,
        ticket_type: a.ticket_type?.name || null,
        order_number: a.order?.order_number || null,
        purchaser_name: a.order?.full_name || null,
        event_name: eventName,
        event_date: eventDate,
      }));

      const pdfBlob = await generateBadgePdf(
        attendeeData,
        template.fields,
        template.background_image_url,
        template.orientation || 'landscape'
      );

      const filename = `badges-${eventName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPdf(pdfBlob, filename);
      
      toast.success(`Generated ${filteredAttendees.length} badges`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Badge Generator</DialogTitle>
          <DialogDescription>
            Design and generate attendee badges for {eventName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'generate' | 'design')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">
              <Download className="h-4 w-4 mr-2" />
              Generate Badges
            </TabsTrigger>
            <TabsTrigger value="design">
              <Settings2 className="h-4 w-4 mr-2" />
              Design Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="text-center py-8">Loading template...</div>
            ) : !template ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">No badge template found for this event.</p>
                <Button onClick={() => setActiveTab('design')}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            ) : (
              <>
                {/* Preview */}
                <div className="flex justify-center">
                  <div className="space-y-2 max-w-full overflow-auto">
                    <p className="text-sm font-medium text-center">
                      Template Preview (100%) ({template.orientation === 'portrait' ? '3" × 4"' : '4" × 3"'})
                    </p>
                    <BadgePreview
                      fields={template.fields}
                      backgroundImageUrl={template.background_image_url}
                      scale={1}
                      orientation={template.orientation || 'landscape'}
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>Filter by Ticket Type</Label>
                    <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All ticket types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ticket Types</SelectItem>
                        {ticketTypes.map((tt) => (
                          <SelectItem key={tt.id} value={tt.name}>
                            {tt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="complete-only"
                      checked={completeOnly}
                      onCheckedChange={(checked) => setCompleteOnly(checked as boolean)}
                    />
                    <Label htmlFor="complete-only" className="cursor-pointer">
                      Only include attendees with complete info
                    </Label>
                  </div>
                </div>

                {/* Summary & Generate */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{filteredAttendees.length} badges to generate</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.ceil(filteredAttendees.length / 6)} page(s) • AVERY 5392 format
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || filteredAttendees.length === 0}
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="design" className="mt-4">
            <BadgeDesigner
              eventId={eventId}
              eventName={eventName}
              eventDate={eventDate}
              onSaved={() => setActiveTab('generate')}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
