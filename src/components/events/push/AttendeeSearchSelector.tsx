import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Attendee {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface AttendeeSearchSelectorProps {
  attendees: Attendee[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function getInitials(firstName: string | null, lastName: string | null, email: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

function getDisplayName(attendee: Attendee): string {
  if (attendee.first_name && attendee.last_name) {
    return `${attendee.first_name} ${attendee.last_name}`;
  }
  if (attendee.first_name) {
    return attendee.first_name;
  }
  return attendee.email || 'Unknown';
}

export function AttendeeSearchSelector({
  attendees,
  selectedIds,
  onSelectionChange,
}: AttendeeSearchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedAttendees = useMemo(() => {
    return attendees.filter(a => selectedIds.includes(a.id));
  }, [attendees, selectedIds]);

  const availableAttendees = useMemo(() => {
    return attendees.filter(a => !selectedIds.includes(a.id));
  }, [attendees, selectedIds]);

  const filteredAttendees = useMemo(() => {
    if (!searchValue) return availableAttendees;
    const search = searchValue.toLowerCase();
    return availableAttendees.filter(a => {
      const name = getDisplayName(a).toLowerCase();
      const email = (a.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [availableAttendees, searchValue]);

  const handleSelect = (attendeeId: string) => {
    onSelectionChange([...selectedIds, attendeeId]);
    setSearchValue('');
  };

  const handleRemove = (attendeeId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== attendeeId));
  };

  return (
    <div className="space-y-3">
      {/* Selected attendees chips */}
      {selectedAttendees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAttendees.map((attendee) => (
            <Badge
              key={attendee.id}
              variant="secondary"
              className="pl-1 pr-1 py-1 flex items-center gap-2"
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10">
                  {getInitials(attendee.first_name, attendee.last_name, attendee.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{getDisplayName(attendee)}</span>
              <button
                type="button"
                onClick={() => handleRemove(attendee.id)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-muted-foreground">
              {selectedIds.length > 0
                ? `${selectedIds.length} attendee${selectedIds.length > 1 ? 's' : ''} selected`
                : 'Search attendees...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No attendees found.</CommandEmpty>
              <CommandGroup>
                {filteredAttendees.map((attendee) => (
                  <CommandItem
                    key={attendee.id}
                    value={attendee.id}
                    onSelect={() => handleSelect(attendee.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10">
                        {getInitials(attendee.first_name, attendee.last_name, attendee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getDisplayName(attendee)}
                      </p>
                      {attendee.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {attendee.email}
                        </p>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedIds.includes(attendee.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
