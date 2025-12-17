import { useState, useMemo, useEffect } from 'react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Service, Business } from '../../types';
import { Plus, Minus, Info } from 'lucide-react';
import { format } from 'date-fns';

interface BookingWidgetProps {
  services: Service[];
  business: Business;
  onContinue: (bookingData: any) => void;
  isSticky?: boolean;
}

export function BookingWidget({ services, business, onContinue, isSticky = false }: BookingWidgetProps) {
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partySize, setPartySize] = useState(1);
  const [duration, setDuration] = useState(60);
  
  // NEW: Store real booked slots
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const selectedServiceData = services.find(s => s.id === selectedService);

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    const s = services.find(serv => serv.id === serviceId);
    if (s) setDuration(s.duration);
  };

  // --- FETCH REAL BOOKINGS ---
  useEffect(() => {
    if (selectedDate && business.id) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      fetch(`http://localhost:5000/api/bookings?merchant_id=${business.id}&date=${dateStr}`)
        .then(res => res.json())
        .then(data => {
            setBookedSlots(data || []);
        })
        .catch(err => console.error("Failed to fetch slots", err));
    } else {
        setBookedSlots([]);
    }
  }, [selectedDate, business.id]);

  // --- GENERATE SLOTS ---
  const timeSlots = useMemo(() => {
    if (!selectedDate || !business.hours) return [];

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[selectedDate.getDay()];
    const hoursString = business.hours[dayName];

    if (!hoursString || hoursString.toLowerCase() === 'closed') {
        return [];
    }

    const [startStr, endStr] = hoursString.split(' - ');
    if (!startStr || !endStr) return [];

    const parseTime = (timeStr: string) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    const startMinutes = parseTime(startStr);
    const endMinutes = parseTime(endStr);
    const slots = [];

    for (let current = startMinutes; current <= endMinutes - duration; current += 30) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayM = m < 10 ? `0${m}` : m;
        const timeLabel = `${displayH}:${displayM} ${ampm}`;

        // CHECK REAL AVAILABILITY
        const isBooked = bookedSlots.includes(timeLabel); 

        slots.push({
            time: timeLabel,
            status: isBooked ? 'booked' : 'available'
        });
    }

    return slots;
  }, [selectedDate, business.hours, duration, bookedSlots]);

  const calculateTotal = () => {
    if (!selectedServiceData) return 0;
    return selectedServiceData.price * partySize; // <--- Added multiplier
  };

  const handleContinue = () => {
  if (!selectedService || !selectedDate || !selectedTime) return;

  onContinue({
    service: selectedServiceData,
    date: selectedDate,
    time: selectedTime,
    partySize,
    duration,
    totalPrice: calculateTotal(),
    // Add these two lines:
    staffId: selectedStaffId === 'any' ? null : selectedStaffId,
    staffName: selectedStaffId === 'any' 
      ? 'Any Professional' 
      : business.staff?.find((s: any) => s.id.toString() === selectedStaffId)?.name
  });
};

  const containerClasses = isSticky
    ? 'bg-white rounded-2xl shadow-soft p-6 sticky top-24'
    : 'bg-white rounded-2xl shadow-soft p-6';

  return (
    <div className={containerClasses}>
      <h5 className="mb-6">Book Now</h5>
      <div className="mb-6">
        <label className="block text-sm mb-2">Select Service</label>
        <Select value={selectedService} onValueChange={handleServiceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a service..." />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{service.name}</span>
                  <span className="text-[var(--color-text-secondary)] ml-4">${service.price}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

{/* Select Staff Section */}
      <div className="mt-4 mb-6">
        <label className="block text-sm mb-2">Select Staff</label>
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger>
            <SelectValue placeholder="Any Professional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Professional</SelectItem>
            {business.staff && business.staff.map((member: any) => (
              <SelectItem key={member.id} value={member.id.toString()}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-6" />

      <div className="mb-6">
        <label className="block text-sm mb-2">Select Date</label>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-xl border"
          disabled={(date) => {
            const today = new Date();
            today.setHours(0,0,0,0);
            return date < today;
          }}
        />
      </div>

      {selectedDate && (
        <div className="mb-6">
          <label className="block text-sm mb-2">Select Time</label>
          {timeSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {timeSlots.map((slot) => (
                <Button
                  key={slot.time}
                  variant={selectedTime === slot.time ? 'default' : 'outline'}
                  size="sm"
                  disabled={slot.status === 'booked'}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`
                    ${selectedTime === slot.time ? 'bg-[var(--color-secondary)]' : ''}
                    ${slot.status === 'booked' ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : ''}
                  `}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 border border-dashed rounded-lg text-gray-500">
               No slots available (Closed)
            </div>
          )}
        </div>
      )}

      <Separator className="my-6" />
      <div className="mb-6">
        <label className="block text-sm mb-2">Party Size</label>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setPartySize(Math.max(1, partySize - 1))}> <Minus className="w-4 h-4" /> </Button>
          <span className="text-lg min-w-[3ch] text-center">{partySize}</span>
          <Button variant="outline" size="sm" onClick={() => setPartySize(partySize + 1)}> <Plus className="w-4 h-4" /> </Button>
        </div>
      </div>

      <Separator className="my-6" />
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--color-text-secondary)]">
            Service {partySize > 1 && `(x${partySize})`}
          </span>
          <span>${calculateTotal()}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--color-text-secondary)]">Booking Fee</span>
          <span>${business.bookingFee || 0}</span>
        </div>
        <Separator className="my-3" />
        <div className="flex items-center justify-between">
          <span>Total</span>
          <span className="text-xl">${calculateTotal() + (business.bookingFee || 0)}</span>
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={!selectedService || !selectedDate || !selectedTime}
        className="w-full bg-[var(--color-secondary)] hover:bg-[#6B7AE5] text-white h-12"
      >
        Continue to Details
      </Button>
    </div>
  );
}