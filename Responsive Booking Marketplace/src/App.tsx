import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { ScrollToTop } from './components/shared/ScrollToTop';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Hero } from './components/home/Hero';
import { SearchResults } from './components/pages/SearchResults';
import { BusinessProfile } from './components/pages/BusinessProfile';
import { BookingFlow } from './components/booking/BookingFlow';
import { ConfirmationPage } from './components/booking/ConfirmationPage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";

// --- PASTE THIS HELPER FUNCTION HERE ---
const getImageUrl = (path: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://localhost:5000/${path.replace(/\\/g, '/')}`;
};

// Helper: Check if business is open right now
const checkIsOpen = (hoursJson: string) => {
    if (!hoursJson) return false;
    try {
        const schedule = JSON.parse(hoursJson);
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'Long' }); // e.g., "Monday"
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }); // e.g., "14:30"

        const todaySchedule = schedule.find((s: any) => s.day === currentDay);
        
        if (todaySchedule && todaySchedule.isOpen === 1) {
            return currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;
        }
        return false;
    } catch (e) {
        return false;
    }
};

const PREDEFINED_CATEGORIES = ['Salon', 'Restaurant', 'Fitness'];

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false); // <--- Added for Popup
  
  // Real Data State
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookingData, setBookingData] = useState<any>(null);

  // 1. Fetch Merchant List & Merge Categories
  useEffect(() => {
    fetch('http://localhost:5000/api/merchants')
      .then(res => res.json())
      .then(data => {
        // A. Categories Logic
        const dbCategories = data.map((m: any) => m.industry).filter(Boolean);
        const uniqueSet = new Set(PREDEFINED_CATEGORIES);
        dbCategories.forEach((cat: string) => {
             const exists = Array.from(uniqueSet).some(c => c.toLowerCase() === cat.toLowerCase());
             if (!exists) uniqueSet.add(cat);
        });
        setCategories(Array.from(uniqueSet));

        // B. Transform Data & Calculate Attributes
        const mappedData = data.map((b: any) => {
          const minPrice = b.min_price || 0;
          
          // Logic: Price Tier
          let tier = 1; 
          if (minPrice > 100) tier = 4;      
          else if (minPrice > 60) tier = 3;  
          else if (minPrice > 30) tier = 2;

          // Logic: Open Now
          const isOpenNow = checkIsOpen(b.hours_json);

          return {
            id: b.id,
            slug: b.slug,
            name: b.name,
            category: b.industry || 'Uncategorized',
            description: b.about || 'No description available',
            // Use Logo for the card image (fallback to cover photo if no logo)
image: getImageUrl(b.logo_path) || getImageUrl(b.cover_photo_path),
            location: b.address,
            rating: 5.0, 
            reviewCount: 0,
            depositRequired: b.deposit_required ? Boolean(b.deposit_required) : false,
            minPrice: minPrice,
            priceTier: tier,
            isOpen: isOpenNow,
            
            whatsappEnabled: true,
            instantConfirm: true,
            phone: b.phone || '', // <--- Use the real phone from database
            address: b.address,
            gallery: [getImageUrl(b.cover_photo_path)],
            hours: {},
            badges: isOpenNow ? ['Open Now'] : []
          };
        });
        
        setBusinesses(mappedData);
        setFilteredBusinesses(mappedData);
      })
      .catch(err => console.error("Failed to fetch merchants:", err));
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. Advanced Search Logic
  const handleSearch = (filters: any) => {
    if (!filters || Object.keys(filters).length === 0) {
        setFilteredBusinesses(businesses);
        handleNavigate('browse');
        return;
    }

    const results = businesses.filter(b => {
      // Filter 1: Text Search (Name OR Address)
      const matchQuery = filters.query 
        ? (b.name.toLowerCase().includes(filters.query.toLowerCase()) || 
           b.address.toLowerCase().includes(filters.query.toLowerCase()))
        : true;

      // Filter 2: Category
      const matchCategory = filters.categories?.length > 0 
        ? filters.categories.some((c: string) => c.toLowerCase() === b.category.toLowerCase())
        : true;

      // Filter 3: Deposit
      const matchDeposit = filters.noDeposit 
        ? b.depositRequired === false 
        : true;

      // Filter 4: Price Tier
      const matchPrice = filters.priceTiers?.length > 0 
        ? filters.priceTiers.includes(b.priceTier)
        : true;

      // Filter 5: Open Now
      const matchOpen = filters.openNow 
        ? b.isOpen === true 
        : true;

      // Filter 6: Location (Legacy)
      const matchLocation = filters.location 
        ? b.address.toLowerCase().includes(filters.location.toLowerCase()) 
        : true;

      return matchQuery && matchCategory && matchDeposit && matchPrice && matchOpen && matchLocation;
    });

    setFilteredBusinesses(results);
    handleNavigate('browse');
  };

  // 3. Fetch Details
  const handleBusinessClick = async (business: Business) => {
    try {
      console.log("Fetching data for ID:", business.id); // Debugging Log

      // 1. Fetch from Backend
      const res = await fetch(`http://localhost:5000/api/merchants/${business.id}`);
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      
      const fullData = await res.json();
      console.log("Server Response:", fullData); // Debugging Log

      // 2. TRANSLATE: Working Hours (Array -> Object)
      // Database gives: [{day_of_week: 'Monday', open_time: '09:00', ...}]
      // Frontend needs: { 'Monday': '09:00 - 17:00' }
      const formattedHours: any = {};
      if (fullData.hours && Array.isArray(fullData.hours)) {
         fullData.hours.forEach((h: any) => {
             if (h.is_open) {
                 formattedHours[h.day_of_week] = `${h.open_time} - ${h.close_time}`;
             } else {
                 formattedHours[h.day_of_week] = 'Closed';
             }
         });
      }

      // 3. TRANSLATE: Reviews (Snake_case -> CamelCase)
      const mappedReviews = (fullData.reviews || []).map((r: any) => ({
        id: r.id.toString(),
        customerName: r.customer_name,
        rating: r.rating,
        comment: r.comment,
        date: new Date(r.date),
        verified: Boolean(r.verified)
      }));
      setReviews(mappedReviews);

      // 4. TRANSLATE: Merchant Details (Database -> Frontend Props)
      setSelectedBusiness({
        ...business, // Keep basic list info
        // Overwrite with detailed info from DB:
        description: fullData.about || "No description provided.",
        phone: fullData.phone || business.phone,
        address: fullData.address || business.address,
        bookingFee: fullData.booking_fee || 0,
        staff: fullData.staff || [],
        hours: formattedHours, // Use the translated hours
        policies: {
          // If you stored policies as a JSON string, parse it. 
          // If stored as separate columns, map them:
          cancellation: fullData.cancellation_policy || "Standard 24h cancellation",
          deposit: fullData.deposit_required ? "Deposit Required" : "No deposit required",
          lateArrival: "15 min grace period"
        },
        // Ensure images act as a fallback array
        gallery: [
            getImageUrl(fullData.cover_photo_path), 
            getImageUrl(fullData.logo_path)
        ].filter((src): src is string => Boolean(src)),
        
        // Safety for arrays
        badges: fullData.badges || [], 
      });

      // 5. Update Services State
      setSelectedServices(fullData.services || []);
      
      // 6. Navigate
      setCurrentPage('business-profile');
      window.scrollTo(0, 0);

    } catch (err) {
      console.error("CRITICAL ERROR:", err);
      // Even if it fails, go to the page so you aren't stuck, 
      // but it will likely be empty. Check Console (F12) to see the error.
      setSelectedBusiness(business);
      setCurrentPage('business-profile');
    }
  };

  const handleStartBooking = (data: any) => {
    setBookingData(data);
    setCurrentPage('booking-flow');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingComplete = async (finalData: any) => {
      try {
        const payload = {
          merchant_id: selectedBusiness.id,
          service_id: finalData.service.id,
          staff_id: finalData.staffId, // <--- Add this line
          customer_name: finalData.name,
          customer_phone: finalData.phone,
          customer_email: finalData.email,
          booking_date: finalData.date.toISOString().split('T')[0], 
          booking_time: finalData.time,
          party_size: finalData.partySize,
          total_price: finalData.totalPrice,
          notes: finalData.notes
        };

        const response = await fetch('http://localhost:5000/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setShowSuccessDialog(true); // <--- Trigger the popup instead of navigation
        } else {
          toast.error("Booking failed. Please try again.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Network error. Please check your connection.");
      }
    };

  return (
    <div className="min-h-screen">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} onAuthClick={() => {}} />

      {currentPage === 'home' && (
        <>
          <Hero onSearch={handleSearch} />
          <Footer />
        </>
      )}

      {currentPage === 'browse' && (
        <>
          <SearchResults
            businesses={filteredBusinesses} 
            onBusinessClick={(id) => {
  const business = businesses.find(b => b.id === id);
  if (business) handleBusinessClick(business);
}}
            categories={categories}
            onFilterChange={handleSearch}
          />
          <Footer />
        </>
      )}

      {currentPage === 'business-profile' && selectedBusiness && (
        <>
          <BusinessProfile
            business={selectedBusiness}
            services={selectedServices}
            reviews={reviews}  // <--- Pass the real state
            onStartBooking={handleStartBooking}
            onWhatsAppClick={() => {}}
            onNavigate={handleNavigate} // <--- Add this line
          />
          <Footer />
        </>
      )}

      {currentPage === 'booking-flow' && selectedBusiness && (
        <BookingFlow
          business={selectedBusiness}
          initialData={bookingData}
          onComplete={handleBookingComplete}
          onBack={() => handleNavigate('business-profile')}
        />
      )}
      
      {currentPage === 'confirmation' && (
         <ConfirmationPage 
            booking={bookingData} 
            onHome={() => handleNavigate('home')}
            onReschedule={() => {}}
            onViewBookings={() => {}}
            onWhatsAppClick={() => {}}
         />
      )}

      {/* Booking Success Popup */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Booking Confirmed!</AlertDialogTitle>
            <AlertDialogDescription>
              Your appointment has been successfully booked. We have sent the details to your WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setShowSuccessDialog(false);
                handleNavigate('home'); // Redirect to Home
              }}
              style={{ backgroundColor: '#00A874', color: 'white' }}
              className="hover:opacity-90"
            >
              Okay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
      <ScrollToTop />
    </div>
  );
}