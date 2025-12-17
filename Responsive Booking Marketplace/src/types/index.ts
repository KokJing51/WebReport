export type BusinessCategory = 'salon' | 'restaurant' | 'sports';

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  priceRange: number;
  location: string;
  distance?: number;
  nextAvailable?: string;
  badges: string[];
  whatsappEnabled: boolean;
  instantConfirm: boolean;
  phone: string;
  address: string;
  bookingFee?: number; // <--- Add this
  staff?: Staff[];     // <--- Add this
  policies: {
    cancellation: string;
    deposit: string;
    lateArrival: string;
  };
  gallery: string[];
  hours: {
    [key: string]: string;
  };
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  staff?: string[];
}

export interface TimeSlot {
  time: string;
  status: 'available' | 'selected' | 'held' | 'booked' | 'disabled';
}

export interface Booking {
  id: string;
  referenceCode: string;
  business: Business;
  service: Service;
  date: Date;
  time: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  status: 'upcoming' | 'past' | 'cancelled';
  whatsappUpdates: boolean;
  totalPrice: number;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: Date;
  verified: boolean;
}

export interface Staff {
  id: string;
  name: string;
  bio: string;
  photo_path?: string;
  specialties?: string[];
}