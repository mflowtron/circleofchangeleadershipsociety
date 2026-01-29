import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Speaker } from '@/hooks/useSpeakers';
import type { SpeakerRole, SpeakerAssignment } from '@/hooks/useAgendaItems';

const SPEAKER_ROLES: { value: SpeakerRole; label: string }[] = [
  { value: 'speaker', label: 'Speaker' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'panelist', label: 'Panelist' },
];

interface SpeakerSelectorProps {
  speakers: Speaker[];
  selectedSpeakers: SpeakerAssignment[];
  onSelectionChange: (assignments: SpeakerAssignment[]) => void;
  disabled?: boolean;
}

export function SpeakerSelector({
  speakers,
  selectedSpeakers,
  onSelectionChange,
  disabled,
}: SpeakerSelectorProps) {
  const [open, setOpen] = useState(false);

  const addSpeaker = (speakerId: string) => {
    if (!selectedSpeakers.some(s => s.speaker_id === speakerId)) {
      onSelectionChange([
        ...selectedSpeakers,
        { speaker_id: speakerId, role: 'speaker' },
      ]);
    }
    setOpen(false);
  };

  const removeSpeaker = (speakerId: string) => {
    onSelectionChange(selectedSpeakers.filter(s => s.speaker_id !== speakerId));
  };

  const updateRole = (speakerId: string, role: SpeakerRole) => {
    onSelectionChange(
      selectedSpeakers.map(s =>
        s.speaker_id === speakerId ? { ...s, role } : s
      )
    );
  };

  const getSpeakerById = (id: string) => speakers.find(s => s.id === id);

  const availableSpeakers = speakers.filter(
    s => !selectedSpeakers.some(ss => ss.speaker_id === s.id)
  );

  return (
    <div className="space-y-3">
      {/* Selected speakers list */}
      {selectedSpeakers.length > 0 && (
        <div className="space-y-2">
          {selectedSpeakers.map((assignment) => {
            const speaker = getSpeakerById(assignment.speaker_id);
            if (!speaker) return null;

            const initials = speaker.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={assignment.speaker_id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-card"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={speaker.photo_url || undefined} alt={speaker.name} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{speaker.name}</p>
                </div>

                <Select
                  value={assignment.role}
                  onValueChange={(value) => updateRole(speaker.id, value as SpeakerRole)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPEAKER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeSpeaker(speaker.id)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add speaker button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || availableSpeakers.length === 0}
          >
            {availableSpeakers.length === 0 
              ? 'No more speakers available' 
              : 'Add speaker...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search speakers..." />
            <CommandList>
              <CommandEmpty>No speakers found.</CommandEmpty>
              <CommandGroup>
                {availableSpeakers.map((speaker) => {
                  const initials = speaker.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <CommandItem
                      key={speaker.id}
                      value={speaker.name}
                      onSelect={() => addSpeaker(speaker.id)}
                      className="cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={speaker.photo_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span>{speaker.name}</span>
                      {speaker.title && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          {speaker.title}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {speakers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No speakers added yet. Add speakers first in the Speakers tab.
        </p>
      )}
    </div>
  );
}
