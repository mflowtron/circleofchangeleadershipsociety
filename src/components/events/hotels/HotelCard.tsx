import { Building2, Phone, MapPin, ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EventHotel } from '@/hooks/useEventHotels';

interface HotelCardProps {
  hotel: EventHotel;
  onEdit?: (hotel: EventHotel) => void;
  onDelete?: (hotel: EventHotel) => void;
}

export function HotelCard({ hotel, onEdit, onDelete }: HotelCardProps) {
  return (
    <Card className="overflow-hidden">
      {/* Hotel Image */}
      <div className="aspect-video relative bg-muted">
        {hotel.image_url ? (
          <img 
            src={hotel.image_url} 
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{hotel.name}</h3>
            <div className="flex items-start gap-1.5 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{hotel.address}</span>
            </div>
          </div>
          
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(hotel)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(hotel)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {hotel.phone && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{hotel.phone}</span>
          </div>
        )}
        
        {hotel.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {hotel.description}
          </p>
        )}

        {hotel.rate_description && (
          <p className="text-sm font-semibold text-primary mt-3">
            {hotel.rate_description}
          </p>
        )}

        {hotel.booking_url && (
          <a
            href={hotel.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
          >
            Reserve Now
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
