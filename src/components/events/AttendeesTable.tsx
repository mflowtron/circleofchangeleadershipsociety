import { useState } from 'react';
import { Check, X, Pencil, Download, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Attendee, useUpdateAttendee } from '@/hooks/useAttendees';
import { toast } from 'sonner';

interface AttendeesTableProps {
  attendees: Attendee[];
  isLoading: boolean;
  ticketTypes: Array<{ id: string; name: string }>;
  onExport: () => void;
}

export function AttendeesTable({
  attendees,
  isLoading,
  ticketTypes,
  onExport,
}: AttendeesTableProps) {
  const [search, setSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const updateAttendee = useUpdateAttendee();

  const filteredAttendees = attendees.filter((attendee) => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      attendee.attendee_name?.toLowerCase().includes(searchLower) ||
      attendee.attendee_email?.toLowerCase().includes(searchLower) ||
      attendee.order?.order_number.toLowerCase().includes(searchLower) ||
      attendee.order?.full_name.toLowerCase().includes(searchLower);

    // Ticket type filter
    const matchesTicket =
      ticketFilter === 'all' || attendee.ticket_type_id === ticketFilter;

    // Status filter
    const isComplete = attendee.attendee_name && attendee.attendee_email;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'complete' && isComplete) ||
      (statusFilter === 'incomplete' && !isComplete);

    return matchesSearch && matchesTicket && matchesStatus;
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

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await updateAttendee.mutateAsync({
        id: editingId,
        attendee_name: editName || null,
        attendee_email: editEmail || null,
      });
      toast.success('Attendee updated');
      cancelEdit();
    } catch (error) {
      toast.error('Failed to update attendee');
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border animate-pulse">
        <div className="h-48 bg-muted" />
      </div>
    );
  }

  const completeCount = attendees.filter(
    (a) => a.attendee_name && a.attendee_email
  ).length;
  const incompleteCount = attendees.length - completeCount;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total:</span>
          <Badge variant="secondary">{attendees.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Complete:</span>
          <Badge variant="default" className="bg-green-600">
            {completeCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Incomplete:</span>
          <Badge variant="destructive">{incompleteCount}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search attendees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={ticketFilter} onValueChange={setTicketFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ticket type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            {ticketTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Attendee Name</TableHead>
              <TableHead>Attendee Email</TableHead>
              <TableHead>Ticket Type</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Purchaser</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No attendees found
                </TableCell>
              </TableRow>
            ) : (
              filteredAttendees.map((attendee) => {
                const isComplete = attendee.attendee_name && attendee.attendee_email;
                const isEditing = editingId === attendee.id;

                return (
                  <TableRow key={attendee.id}>
                    <TableCell>
                      {isComplete ? (
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Incomplete
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                          className="h-8"
                        />
                      ) : (
                        <span className={!attendee.attendee_name ? 'text-muted-foreground italic' : ''}>
                          {attendee.attendee_name || 'Not provided'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          type="email"
                          className="h-8"
                        />
                      ) : (
                        <span className={!attendee.attendee_email ? 'text-muted-foreground italic' : ''}>
                          {attendee.attendee_email || 'Not provided'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{attendee.ticket_type?.name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {attendee.order?.order_number || '-'}
                    </TableCell>
                    <TableCell>{attendee.order?.full_name || '-'}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveEdit}
                            disabled={updateAttendee.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(attendee)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
