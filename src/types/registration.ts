// Types for the public conference registration flow
// This flow operates outside Supabase auth — uses OTP + sessionStorage

export interface RegistrationSession {
  email: string;
  sessionToken: string;
  expiresAt: number; // Unix ms
}

export interface RegistrationCheckoutRequest {
  event_id: string;
  tickets: Array<{ ticket_type_id: string; quantity: number }>;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  organization_name?: string;
  referral_source?: string;
  purchaser_is_attending?: boolean;
  pricing_tier?: string;
}

export interface RegistrationOrder {
  registration_id: string;
  pricing_tier: string | null;
  order: {
    id: string;
    order_number: string;
    email: string;
    full_name: string;
    phone: string | null;
    organization_name: string | null;
    referral_source: string | null;
    status: 'pending' | 'completed' | 'cancelled' | 'refunded';
    subtotal_cents: number;
    fees_cents: number;
    total_cents: number;
    completed_at: string | null;
    created_at: string;
    purchaser_is_attending: boolean | null;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string | null;
    venue_name: string | null;
    venue_address: string | null;
    cover_image_url: string | null;
  };
  order_items: RegistrationOrderItem[];
  attendees: RegistrationAttendee[];
  attendee_stats: {
    total: number;
    named: number;
    forms_sent: number;
    forms_complete: number;
  };
}

export interface RegistrationOrderItem {
  id: string;
  quantity: number;
  unit_price_cents: number;
  ticket_type: {
    id: string;
    name: string;
    is_virtual: boolean;
  } | null;
}

export interface RegistrationAttendee {
  id: string;
  attendee_name: string;
  attendee_email: string;
  is_purchaser: boolean;
  form_status: 'needs_info' | 'pending' | 'completed';
  tally_form_sent_at: string | null;
  tally_form_completed_at: string | null;
  qr_token: string | null;
}

export interface VerifyPaymentResponse {
  success: boolean;
  order: {
    id: string;
    order_number: string;
    email: string;
    full_name: string;
    organization_name: string | null;
    status: string;
    subtotal_cents: number;
    fees_cents: number;
    total_cents: number;
    created_at: string;
    completed_at: string | null;
    order_items: Array<{
      id: string;
      quantity: number;
      unit_price_cents: number;
      ticket_type: { name: string } | null;
    }>;
  };
  registration: {
    id: string;
    pricing_tier: string | null;
  };
}

// Pricing constants (cents)
export const PRICING = {
  SERVICE_FEE_CENTS: 2532, // $25.32 per ticket
  EARLY_BIRD_DEADLINE: '2026-04-15T23:59:59Z',
} as const;

// Conference branding colors for the registration pages
export const REGISTRATION_COLORS = {
  burgundy: '#6B1D3A',
  burgundyDark: '#4A1228',
  burgundyDeep: '#2D0A18',
  gold: '#DFA51F',
  cream: '#FFF8F0',
  white: '#FFFFFF',
  green: '#2D8B55',
  orange: '#D4780A',
} as const;
