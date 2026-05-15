import { useState } from 'react';
import { Pencil, X, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { RegistrationAttendee } from '@/types/registration';

interface AttendeeSlotProps {
  attendee: RegistrationAttendee;
  index: number;
  onSave: (data: { attendee_name: string; attendee_email: string }) => Promise<void>;
  disabled?: boolean;
}

function StatusBadge({ attendee }: { attendee: RegistrationAttendee }) {
  const hasInfo = attendee.attendee_name?.trim() && attendee.attendee_email?.trim();

  if (attendee.form_status === 'completed') {
    return (
      <Badge className="bg-[#2D8B55] text-white hover:bg-[#2D8B55]/90 border-0">
        Form Complete
      </Badge>
    );
  }
  if (attendee.form_status === 'pending') {
    return (
      <Badge className="bg-[#D4780A] text-white hover:bg-[#D4780A]/90 border-0">
        Sent — Awaiting
      </Badge>
    );
  }
  if (hasInfo) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-0">
        Needs Info
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-0">
      Empty
    </Badge>
  );
}

export function AttendeeSlot({ attendee, index, onSave, disabled }: AttendeeSlotProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(attendee.attendee_name || '');
  const [email, setEmail] = useState(attendee.attendee_email || '');
  const [isSaving, setIsSaving] = useState(false);

  const hasInfo = attendee.attendee_name?.trim() && attendee.attendee_email?.trim();
  const isEmpty = !hasInfo;
  const canEdit = attendee.form_status !== 'completed';

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ attendee_name: name.trim(), attendee_email: email.trim() });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(attendee.attendee_name || '');
    setEmail(attendee.attendee_email || '');
    setIsEditing(false);
  };

  // Empty slot — show add button
  if (isEmpty && !isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        disabled={disabled}
        className="w-full p-4 rounded-xl border-2 border-dashed transition-colors text-left disabled:opacity-50"
        style={{ borderColor: '#d4c5b9', color: '#8B6F5E' }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f5f0ea' }}>
            <User className="h-5 w-5" style={{ color: '#8B6F5E' }} />
          </div>
          <div>
            <p className="font-medium text-sm">+ Add Attendee</p>
            <p className="text-xs opacity-70">Ticket #{index + 1}</p>
          </div>
        </div>
      </button>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div
        className="p-4 rounded-xl border-2"
        style={{ borderColor: '#6B1D3A', backgroundColor: '#FFF8F0' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: '#6B1D3A' }}>
            Ticket #{index + 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            className="bg-white"
          />
          <Input
            placeholder="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSaving}
            className="bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !email.trim()}
            size="sm"
            className="gap-1"
            style={{ backgroundColor: '#6B1D3A' }}
          >
            <Check className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Filled slot — view mode
  return (
    <div className="p-4 rounded-xl border bg-white" style={{ borderColor: '#e8ddd0' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#6B1D3A' }}
          >
            <span className="text-white text-sm font-medium">
              {attendee.attendee_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate" style={{ color: '#2D0A18' }}>
                {attendee.attendee_name}
              </p>
              {attendee.is_purchaser && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#DFA51F] text-[#DFA51F]">
                  YOU
                </Badge>
              )}
            </div>
            <p className="text-xs truncate" style={{ color: '#8B6F5E' }}>
              {attendee.attendee_email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <StatusBadge attendee={attendee} />
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
