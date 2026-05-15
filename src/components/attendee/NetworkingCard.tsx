import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NetworkablePerson } from '@/hooks/useNetworking';

interface NetworkingCardProps {
  person: NetworkablePerson;
  onMessage: () => void;
  loading?: boolean;
}

export function NetworkingCard({ person, onMessage, loading }: NetworkingCardProps) {
  const initials = person.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-start gap-3 p-4 border-b border-border last:border-b-0">
      <Avatar className="h-12 w-12">
        <AvatarImage src={person.avatar_url} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{person.name}</h3>
          {person.type === 'speaker' && (
            <Badge variant="secondary" className="shrink-0">Speaker</Badge>
          )}
        </div>

        {(person.title || person.company) && (
          <p className="text-sm text-muted-foreground truncate">
            {[person.title, person.company].filter(Boolean).join(' • ')}
          </p>
        )}

        {person.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {person.bio}
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onMessage}
        disabled={loading}
        className="shrink-0"
      >
        <MessageCircle className="h-4 w-4 mr-1" />
        Message
      </Button>
    </div>
  );
}
