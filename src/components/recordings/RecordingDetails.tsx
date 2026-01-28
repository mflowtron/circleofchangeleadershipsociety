import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';
import { Recording } from './RecordingCard';

interface RecordingDetailsProps {
  recording: Recording;
}

export function RecordingDetails({ recording }: RecordingDetailsProps) {
  const [uploaderName, setUploaderName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUploader = async () => {
      if (!recording.uploaded_by) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', recording.uploaded_by)
        .single();

      if (data) {
        setUploaderName(data.full_name);
      }
    };

    fetchUploader();
  }, [recording.uploaded_by]);

  // Format description with paragraph breaks
  const formatDescription = (text: string | null) => {
    if (!text) return null;
    return text.split('\n').filter(p => p.trim()).map((paragraph, i) => (
      <p key={i} className="mb-3 last:mb-0">
        {paragraph}
      </p>
    ));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{recording.title}</h1>
        
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(recording.created_at), 'MMMM d, yyyy')}
            </span>
          </div>
          
          {uploaderName && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>Uploaded by {uploaderName}</span>
            </div>
          )}
        </div>
      </div>

      {recording.description && (
        <div className="text-foreground/80 leading-relaxed">
          {formatDescription(recording.description)}
        </div>
      )}
    </div>
  );
}
