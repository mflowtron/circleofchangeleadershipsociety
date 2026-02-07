import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Check, X, Pencil, AlertCircle, Loader2 } from 'lucide-react';

interface Attendee {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type_id: string;
  order_item_id: string;
  is_purchaser: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  ticket_type: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface AttendeeListProps {
  attendees: Attendee[];
  orderItems: OrderItem[];
}

export function AttendeeList({ attendees, orderItems }: AttendeeListProps) {
  const { updateAttendee, loading } = useOrderPortal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Group attendees by ticket type, with purchaser first
  const ticketTypeMap = new Map<string, { name: string; attendees: Attendee[] }>();
  
  // Sort attendees so purchaser comes first
  const sortedAttendees = [...attendees].sort((a, b) => {
    if (a.is_purchaser && !b.is_purchaser) return -1;
    if (!a.is_purchaser && b.is_purchaser) return 1;
    return 0;
  });
  
  orderItems.forEach(item => {
    if (item.ticket_type) {
      const typeAttendees = sortedAttendees.filter(a => a.order_item_id === item.id);
      ticketTypeMap.set(item.ticket_type.id, {
        name: item.ticket_type.name,
        attendees: typeAttendees,
      });
    }
  });

  const startEdit = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setEditName(attendee.attendee_name || '');
    setEditEmail(attendee.attendee_email || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
  };

  const saveEdit = async (attendeeId: string) => {
    if (!editName.trim() || !editEmail.trim()) return;
    
    setSaving(true);
    const result = await updateAttendee(attendeeId, editName.trim(), editEmail.trim());
    setSaving(false);
    
    if (result.success) {
      setEditingId(null);
    }
  };

  const isComplete = (attendee: Attendee) => 
    attendee.attendee_name && attendee.attendee_email;

  return (
    <div className="space-y-4">
      {Array.from(ticketTypeMap.entries()).map(([typeId, { name, attendees: typeAttendees }]) => (
        <div key={typeId} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{name}</h4>
          <div className="space-y-2">
            {typeAttendees.map((attendee, index) => (
              <div 
                key={attendee.id}
                className={`
                  border rounded-lg p-3
                  ${!isComplete(attendee) ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : ''}
                `}
              >
                {editingId === attendee.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Full Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={saving}
                    />
                    <Input
                      placeholder="Email Address"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={saving}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => saveEdit(attendee.id)}
                        disabled={saving || !editName.trim() || !editEmail.trim()}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span className="ml-1">Save</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                        <span className="ml-1">Cancel</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {attendee.is_purchaser ? 'Your Registration' : `Attendee ${index + 1}`}
                        </span>
                        {attendee.is_purchaser && (
                          <Badge variant="secondary" className="text-xs">
                            Purchaser
                          </Badge>
                        )}
                        {!isComplete(attendee) && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                      </div>
                      {isComplete(attendee) ? (
                        <div>
                          <p className="font-medium">{attendee.attendee_name}</p>
                          <p className="text-sm text-muted-foreground">{attendee.attendee_email}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {attendee.is_purchaser ? 'Please confirm your details' : 'Please add attendee details'}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(attendee)}
                      disabled={loading}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {attendees.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No attendees to register for this order.
        </p>
      )}
    </div>
  );
}
