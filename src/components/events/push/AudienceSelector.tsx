import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Home, Monitor, Tag, User } from 'lucide-react';
import { type AudienceType, type AudienceFilter } from '@/hooks/usePushNotifications';

interface AudienceCounts {
  total: number;
  inPerson: number;
  virtual: number;
  ticketTypes: Array<{ id: string; name: string; count: number }>;
  attendees: Array<{ id: string; user_id: string | null }>;
}

interface AudienceSelectorProps {
  eventId: string;
  audienceType: AudienceType;
  audienceFilter: AudienceFilter;
  onAudienceTypeChange: (type: AudienceType) => void;
  onAudienceFilterChange: (filter: AudienceFilter) => void;
  audienceCounts: AudienceCounts | null | undefined;
}

export function AudienceSelector({
  audienceType,
  audienceFilter,
  onAudienceTypeChange,
  onAudienceFilterChange,
  audienceCounts,
}: AudienceSelectorProps) {
  const handleTicketTypeToggle = (ticketTypeId: string, checked: boolean) => {
    const currentIds = audienceFilter.ticket_type_ids || [];
    const newIds = checked
      ? [...currentIds, ticketTypeId]
      : currentIds.filter(id => id !== ticketTypeId);
    
    onAudienceFilterChange({
      ...audienceFilter,
      ticket_type_ids: newIds,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Audience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={audienceType}
          onValueChange={(value) => {
            onAudienceTypeChange(value as AudienceType);
            // Reset filter when changing type
            onAudienceFilterChange({});
          }}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4 text-muted-foreground" />
              All Attendees
              <span className="text-muted-foreground">({audienceCounts?.total ?? 0})</span>
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <RadioGroupItem value="in_person" id="in_person" />
            <Label htmlFor="in_person" className="flex items-center gap-2 cursor-pointer">
              <Home className="h-4 w-4 text-muted-foreground" />
              In-Person Only
              <span className="text-muted-foreground">({audienceCounts?.inPerson ?? 0})</span>
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <RadioGroupItem value="virtual" id="virtual" />
            <Label htmlFor="virtual" className="flex items-center gap-2 cursor-pointer">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Virtual Only
              <span className="text-muted-foreground">({audienceCounts?.virtual ?? 0})</span>
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="ticket_type" id="ticket_type" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="ticket_type" className="flex items-center gap-2 cursor-pointer">
                <Tag className="h-4 w-4 text-muted-foreground" />
                By Ticket Type
              </Label>
              
              {audienceType === 'ticket_type' && (
                <div className="mt-3 ml-6 space-y-2">
                  {audienceCounts?.ticketTypes.map((ticketType) => (
                    <div key={ticketType.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ticket-${ticketType.id}`}
                        checked={audienceFilter.ticket_type_ids?.includes(ticketType.id) || false}
                        onCheckedChange={(checked) => 
                          handleTicketTypeToggle(ticketType.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`ticket-${ticketType.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {ticketType.name}
                        <span className="text-muted-foreground ml-1">({ticketType.count})</span>
                      </Label>
                    </div>
                  ))}
                  {(!audienceCounts?.ticketTypes || audienceCounts.ticketTypes.length === 0) && (
                    <p className="text-sm text-muted-foreground">No ticket types found</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 opacity-50">
            <RadioGroupItem value="individual" id="individual" disabled />
            <Label htmlFor="individual" className="flex items-center gap-2 cursor-not-allowed">
              <User className="h-4 w-4 text-muted-foreground" />
              Individual Attendee(s)
              <span className="text-xs text-muted-foreground">(Coming soon)</span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
