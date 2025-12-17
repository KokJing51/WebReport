import { useState } from 'react';
import { Business, Service, Review } from '../../types';
import { BookingWidget } from '../business/BookingWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
// UI Imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

import {
  Star,
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Share2,
  Heart,
  CheckCircle,
  Info,
  Users
} from 'lucide-react';

// Helper to fix image URLs
const getImageUrl = (path: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://localhost:5000/${path.replace(/\\/g, '/')}`;
};

interface BusinessProfileProps {
  business: Business;
  services: Service[];
  reviews: Review[];
  onStartBooking: (bookingData: any) => void;
  onWhatsAppClick: () => void;
  onNavigate: (page: string) => void;
}

export function BusinessProfile({
  business,
  services,
  reviews,
  onStartBooking,
  onWhatsAppClick,
  onNavigate,
}: BusinessProfileProps) {
  const [activeTab, setActiveTab] = useState('about');
  
  // --- REVIEW LOGIC ---
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, comment: '' });
  const [localReviews, setLocalReviews] = useState<Review[]>([]); 

  const handleSubmitReview = async () => {
    if (!newReview.name || !newReview.comment) return;

    try {
      const res = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: business.id,
          customer_name: newReview.name,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (res.ok) {
        // Add to local list immediately
        const addedReview: Review = {
            id: Date.now().toString(),
            customerName: newReview.name,
            rating: newReview.rating,
            comment: newReview.comment,
            date: new Date(),
            verified: false
        };
        setLocalReviews([addedReview, ...localReviews]);
        setIsReviewOpen(false); 
        setNewReview({ name: '', rating: 5, comment: '' });
      }
    } catch (err) {
      console.error("Failed to submit review", err);
    }
  };
  
  // SAFETY: Ensure arrays exist before using them
  const safeReviews = reviews || [];
  const allReviews = [...localReviews, ...safeReviews];
  const safeBadges = business.badges || []; // <--- Fixes the White Screen
  const safeGallery = business.gallery || [];
  const safeStaff = business.staff || [];
  const safePolicies = business.policies || { cancellation: '', deposit: '', lateArrival: '' };

  const getPriceRange = (level: number) => '$'.repeat(level);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* Hero Section */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-6">
            <span 
              className="cursor-pointer hover:text-[var(--color-text-primary)]"
              onClick={() => onNavigate('home')}
            >
              Home
            </span>
            <span>/</span>
            <span 
              className="cursor-pointer hover:text-[var(--color-text-primary)] capitalize"
              onClick={() => onNavigate('browse')}
            >
              Browse
            </span>
            <span>/</span>
            <span className="text-[var(--color-text-primary)]">{business.name}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2>{business.name}</h2>
                    <Badge className="bg-[var(--color-secondary)]10 text-[var(--color-secondary)] capitalize">
                      {business.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg">{business.rating}</span>
                      <span className="text-[var(--color-text-secondary)]">
                        ({business.reviewCount} reviews)
                      </span>
                    </div>
                    <span className="text-[var(--color-text-secondary)]">
                      {getPriceRange(business.priceRange)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-4">
                    <MapPin className="w-5 h-5" />
                    <span>{business.address}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Badges (Fixed: Uses safeBadges) */}
              <div className="flex flex-wrap gap-2 mb-6">
                {business.whatsappEnabled && (
                  <Badge className="bg-[var(--color-accent-whatsapp)] text-white border-none">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    WhatsApp Auto
                  </Badge>
                )}
                {business.instantConfirm && (
                  <Badge className="bg-[var(--color-highlight)] text-white border-none">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Instant Confirm
                  </Badge>
                )}
                {safeBadges.includes('Free Cancellation') && (
                  <Badge variant="outline">Free Cancellation</Badge>
                )}
              </div>

              {/* CTAs */}
              <div className="flex gap-4">
                <Button
                  onClick={onWhatsAppClick}
                  className="flex-1 bg-[var(--color-accent-whatsapp)] hover:bg-[#1FA855] text-white"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message on WhatsApp
                </Button>
                <Button
                  onClick={() => window.location.href = `tel:${business.phone}`}
                  variant="outline"
                  className="flex-1"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call
                </Button>
              </div>
            </div>

            {/* Right: Image Gallery Preview (Fixed: Uses safeGallery) */}
            <div className="lg:w-96">
              <div className="grid grid-cols-2 gap-2">
                {safeGallery.slice(0, 4).map((image, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={image}
                      alt={`${business.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Tabs Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start mb-8">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="team">Our Team</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about">
                <div className="bg-white rounded-2xl p-8 shadow-soft">
                  <h4 className="mb-4">About Us</h4>
                  <p className="text-[var(--color-text-secondary)] mb-6">
                    {business.description}
                  </p>

                  <Separator className="my-6" />

                  <h5 className="mb-4">Opening Hours</h5>
                  <div className="space-y-2">
                    {Object.entries(business.hours).map(([day, hours]) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-[var(--color-text-secondary)]">{day}</span>
                        <span>{hours}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <h5 className="mb-4">Contact</h5>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <span>{business.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <span>{business.address}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services">
                <div className="bg-white rounded-2xl p-8 shadow-soft">
                  <h4 className="mb-6">Services & Pricing</h4>
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="border border-[var(--color-border)] rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="mb-2">{service.name}</h5>
                            <p className="text-[var(--color-text-secondary)] text-sm">
                              {service.description}
                            </p>
                          </div>
                          <span className="text-xl">${service.price}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{service.duration} min</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Team Tab (Fixed: Uses safeStaff) */}
              <TabsContent value="team">
                <div className="bg-white rounded-2xl p-8 shadow-soft">
                  <h4 className="mb-6">Meet Our Team</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {safeStaff.length > 0 ? (
                      safeStaff.map((member: any) => (
                        <div key={member.id} className="flex items-start gap-4 p-4 border rounded-xl">
                           <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                             {member.photo_path ? (
                               <img 
                                 src={getImageUrl(member.photo_path) || ''} 
                                 alt={member.name} 
                                 className="w-full h-full object-cover"
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-400">
                                 <Users className="w-8 h-8" />
                               </div>
                             )}
                           </div>
                           <div>
                             <h5 className="font-medium">{member.name}</h5>
                             <p className="text-sm text-[var(--color-text-secondary)] mt-1">{member.bio}</p>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[var(--color-text-secondary)]">No team members listed.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Policies Tab (Fixed: Uses safePolicies) */}
              <TabsContent value="policies">
                <div className="bg-white rounded-2xl p-8 shadow-soft">
                  <h4 className="mb-6">Things to Know Before Booking</h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-[var(--color-secondary)]" />
                        <h6>Cancellation Policy</h6>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        {safePolicies.cancellation}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-[var(--color-secondary)]" />
                        <h6>Deposit Requirements</h6>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        {safePolicies.deposit}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-[var(--color-secondary)]" />
                        <h6>Late Arrival</h6>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        {safePolicies.lateArrival}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <div className="bg-white rounded-2xl p-8 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <h4>Customer Reviews</h4>
                    
                    {/* Write Review Modal */}
                    <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">Write a Review</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Write a Review for {business.name}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Your Name</Label>
                            <Input 
                              placeholder="John Doe" 
                              value={newReview.name}
                              onChange={(e) => setNewReview({...newReview, name: e.target.value})}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Rating</Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                  key={star}
                                  onClick={() => setNewReview({...newReview, rating: star})}
                                  className="focus:outline-none transition-transform hover:scale-110"
                                >
                                  <Star 
                                    className={`w-8 h-8 ${
                                      star <= newReview.rating 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-300'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Your Review</Label>
                            <Textarea 
                              placeholder="Tell us about your experience..." 
                              value={newReview.comment}
                              onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                              rows={4}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button onClick={handleSubmitReview}>Submit Review</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-6">
                    {allReviews.map((review) => (
                      <div key={review.id} className="border-b border-[var(--color-border)] pb-6 last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)]20 flex items-center justify-center">
                              <span>{review.customerName ? review.customerName[0] : '?'}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{review.customerName}</span>
                                {review.verified && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                <div className="flex items-center">
                                  {Array.from({ length: review.rating }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className="w-3 h-3 fill-yellow-400 text-yellow-400"
                                    />
                                  ))}
                                </div>
                                <span>•</span>
                                <span>{review.date instanceof Date ? review.date.toLocaleDateString() : 'Recent'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-[var(--color-text-secondary)]">{review.comment}</p>
                      </div>
                    ))}
                    {allReviews.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No reviews yet. Be the first to write one!</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Booking Widget */}
          <div className="lg:w-96">
            <BookingWidget
              services={services}
              business={business}
              onContinue={onStartBooking}
              isSticky
            />
          </div>
        </div>
      </div>
    </div>
  );
}