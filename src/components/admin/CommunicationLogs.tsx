import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CircleLoader } from '@/components/ui/circle-loader';
import { MessageSquare, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface OrderMessage {
  id: string;
  order_id: string;
  message: string;
  sender_type: string;
  sender_email: string | null;
  read_at: string | null;
  created_at: string;
  is_important: boolean;
  orders: {
    order_number: string;
    full_name: string;
  } | null;
}

export function CommunicationLogs() {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-communication-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_messages')
        .select(`
          *,
          orders (
            order_number,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as OrderMessage[];
    },
  });

  return (
    <Card className="shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Communication Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <CircleLoader size="sm" />
          </div>
        ) : messages && messages.length > 0 ? (
          <ScrollArea className="h-[250px] px-4">
            <div className="space-y-2 pb-4">
              {messages.map(msg => (
                <Link
                  key={msg.id}
                  to={`/events/manage/orders/${msg.order_id}`}
                  className="block p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={msg.sender_type === 'customer' ? 'secondary' : 'outline'} className="text-xs">
                      {msg.sender_type === 'customer' ? 'Customer' : 'Organizer'}
                    </Badge>
                    {!msg.read_at && msg.sender_type === 'customer' && (
                      <Badge variant="default" className="text-xs">New</Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1 truncate">
                    {msg.orders?.order_number} - {msg.orders?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {msg.message}
                  </p>
                </Link>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
