import { Linkedin, Twitter, Globe } from 'lucide-react';
import { useSpeakers } from '@/hooks/useSpeakers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface EventSpeakersSectionProps {
  eventId: string;
}

export function EventSpeakersSection({ eventId }: EventSpeakersSectionProps) {
  const { speakers, isLoading } = useSpeakers(eventId);

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
          <span className="w-1 h-8 bg-primary rounded-full" />
          Featured Speakers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-premium p-6">
              <div className="flex flex-col items-center text-center">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!speakers || speakers.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
        <span className="w-1 h-8 bg-primary rounded-full" />
        Featured Speakers
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {speakers.map((speaker) => (
          <div 
            key={speaker.id} 
            className="card-premium p-6 hover-lift"
          >
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20">
                {speaker.photo_url ? (
                  <AvatarImage src={speaker.photo_url} alt={speaker.name} />
                ) : null}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {speaker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="font-semibold text-lg mb-1">{speaker.name}</h3>
              
              {(speaker.title || speaker.company) && (
                <p className="text-sm text-muted-foreground mb-3">
                  {speaker.title}
                  {speaker.title && speaker.company && ' at '}
                  {speaker.company && (
                    <span className="text-primary">{speaker.company}</span>
                  )}
                </p>
              )}
              
              {speaker.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {speaker.bio}
                </p>
              )}
              
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-auto">
                {speaker.linkedin_url && (
                  <a 
                    href={speaker.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {speaker.twitter_url && (
                  <a 
                    href={speaker.twitter_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {speaker.website_url && (
                  <a 
                    href={speaker.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
