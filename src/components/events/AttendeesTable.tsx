import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Attendee, useUpdateAttendee } from '@/hooks/useAttendees';
import { toast } from 'sonner';

interface AttendeesTableProps {
  attendees: Attendee[];
  isLoading: boolean;
  ticketTypes: Array<{ id: string; name: string }>;
  onExport: () => void;
  eventMap?: Map<string, string>;
  showEventColumn?: boolean;
}

export function AttendeesTable({
  attendees,
  isLoading,
  ticketTypes,
  onExport,
  eventMap,
  showEventColumn,
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
      <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
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
      <div className="flex flex-col gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search attendees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={ticketFilter} onValueChange={setTicketFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
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
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onExport} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <ResponsiveTable className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              {showEventColumn && <TableHead className="hidden lg:table-cell">Event</TableHead>}
              <TableHead>Attendee</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Ticket</TableHead>
              <TableHead className="hidden lg:table-cell">Order #</TableHead>
              <TableHead className="hidden xl:table-cell">Purchaser</TableHead>
              <TableHead className="hidden 2xl:table-cell">Role</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showEventColumn ? 9 : 8} className="text-center py-8 text-muted-foreground">
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
                          <Check className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Complete</span>
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Incomplete</span>
                        </Badge>
                      )}
                    </TableCell>
                    {showEventColumn && (
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm truncate max-w-[200px] block">
                          {eventMap?.get(attendee.order?.event_id || '') || 'Unknown'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                          className="h-8 min-w-[120px]"
                        />
                      ) : (
                        <div>
                          <span className={!attendee.attendee_name ? 'text-muted-foreground italic' : ''}>
                            {attendee.attendee_name || 'Not provided'}
                          </span>
                          {/* Mobile-only: show email inline */}
                          <div className="md:hidden text-sm text-muted-foreground truncate">
                            {attendee.attendee_email || ''}
                          </div>
                          {/* Mobile-only: show ticket type inline */}
                          <div className="sm:hidden text-xs text-muted-foreground">
                            {attendee.ticket_type?.name || ''}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isEditing ? (
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          type="email"
                          className="h-8 min-w-[150px]"
                        />
                      ) : (
                        <span className={`truncate max-w-[180px] block ${!attendee.attendee_email ? 'text-muted-foreground italic' : ''}`}>
                          {attendee.attendee_email || 'Not provided'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{attendee.ticket_type?.name || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-sm">
                      {attendee.order_id ? (
                        <Link
                          to={`/events/manage/orders/${attendee.order_id}`}
                          className="text-primary hover:underline truncate block max-w-[100px]"
                        >
                          {attendee.order?.order_number || '-'}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="truncate block max-w-[120px]">{attendee.order?.full_name || '-'}</span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      {attendee.is_purchaser ? (
                        <Badge variant="secondary" className="text-xs">Purchaser</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
      </ResponsiveTable>
    </div>
  );
}
