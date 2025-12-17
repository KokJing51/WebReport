import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  Users,
  X
} from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface CalendarPageProps {
  onNavigate: (page: string) => void;
  user?: any;
}

interface TimeSlot {
  id: string;
  time: string;
  status: 'open' | 'hold' | 'booked' | 'cancelled';
  customer?: string;
  service?: string;
  staff?: string;
  bookingId?: number; // Store booking ID for easy lookup
}

interface DayData {
  date: string;
  dayName: string;
  slots: TimeSlot[];
}

interface BookingEvent {
  id?: number;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  customer_name?: string;
  service_name?: string;
  booking_date?: string;
  booking_time?: string;
  status?: string;
}

interface Booking {
  id: number;
  merchant_id: number;
  service_id?: number;
  staff_id?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  total_price?: number;
  notes?: string;
  status: string;
  service_name?: string;
  staff_name?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    case 'hold':
      return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
    case 'booked':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    case 'cancelled':
      return 'bg-red-100 text-red-700 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'open':
      return 'Available';
    case 'hold':
      return 'On Hold';
    case 'booked':
      return 'Booked';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

export function CalendarPage({ onNavigate, user }: CalendarPageProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDayBookings, setSelectedDayBookings] = useState<{ date: string; bookings: BookingEvent[] } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBooking, setNewBooking] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    booking_date: '',
    booking_time: '',
    service_id: '',
    staff_id: '',
    party_size: 1,
    total_price: '',
    notes: ''
  });
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Fetch bookings, services, and staff
  useEffect(() => {
    if (user) {
      const merchantId = user.merchant_id || user.id;
      if (merchantId) {
        fetchBookings();
        fetchServicesAndStaff(merchantId);
      }
    }
  }, [user, currentDate, viewMode]);

  const fetchServicesAndStaff = async (merchantId: number) => {
    try {
      const [servicesData, staffData] = await Promise.all([
        apiService.getServices(merchantId),
        apiService.getStaff(merchantId)
      ]);
      setServices(servicesData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      console.error('Failed to fetch services/staff:', error);
      // Don't show error toast - services/staff are optional
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    
    // Use merchant_id if available, otherwise use user id
    const merchantId = user.merchant_id || user.id;
    if (!merchantId) {
      console.warn('No merchant_id or user id found');
      return;
    }
    
    setIsLoading(true);
    try {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      
      if (viewMode === 'week') {
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
      } else if (viewMode === 'month') {
        startDate.setDate(1);
        endDate.setMonth(currentDate.getMonth() + 1);
        endDate.setDate(0);
      } else {
        // day view
        endDate.setDate(currentDate.getDate() + 1);
      }

      const data = await apiService.getBookings({
        merchant_id: merchantId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      setBookings(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch bookings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert bookings to BookingEvent format
  const bookingEvents: BookingEvent[] = useMemo(() => {
    return bookings.map(booking => {
      const [hours, minutes] = booking.booking_time.split(':').map(Number);
      const date = new Date(booking.booking_date);
      date.setHours(hours, minutes || 0);
      
      const endDate = new Date(date);
      endDate.setHours(date.getHours() + 1); // Default 1 hour duration
      
      return {
        id: booking.id,
        title: `${booking.service_name || 'Service'} - ${booking.customer_name}`,
        start: date.toISOString(),
        end: endDate.toISOString(),
        backgroundColor: booking.status === 'cancelled' ? '#dc3545' : '#0d6efd',
        customer_name: booking.customer_name,
        service_name: booking.service_name,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        status: booking.status
      };
    });
  }, [bookings]);

  // Parse booking title to extract service and customer
  const parseBookingTitle = (title: string): { service: string; customer: string } => {
    const parts = title.split(' - ');
    return {
      service: parts[0] || '',
      customer: parts[1] || ''
    };
  };

  // Generate calendar data from booking events
  const calendarData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday
    
    const weekDays: DayData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      
      const dateStr = dayDate.toISOString().split('T')[0];
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Generate time slots from 9 AM to 6 PM
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour <= 18; hour++) {
        const timeStr = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
        const slotDateTime = new Date(dayDate);
        slotDateTime.setHours(hour, 0, 0, 0);
        
        // Check if there's a booking for this slot
        const booking = bookingEvents.find(event => {
          const eventStart = new Date(event.start);
          const eventDateStr = eventStart.toISOString().split('T')[0];
          return eventDateStr === dateStr && eventStart.getHours() === hour;
        });
        
        if (booking) {
          // Also find the actual booking from bookings array to get the real ID
          const actualBooking = bookings.find(b => {
            if (booking.id && b.id === booking.id) return true;
            // Fallback matching
            return b.customer_name === booking.customer_name && 
                   b.booking_date === dateStr &&
                   b.booking_time.startsWith(`${hour.toString().padStart(2, '0')}:`);
          });
          
          slots.push({
            id: `${dateStr}-${hour}`,
            time: timeStr,
            status: booking.status === 'cancelled' ? 'cancelled' : 'booked',
            customer: booking.customer_name,
            service: booking.service_name || 'Service',
            staff: 'Staff',
            bookingId: actualBooking?.id || booking.id // Use actual booking ID if available
          });
        } else {
          // All empty slots are open
          slots.push({
            id: `${dateStr}-${hour}`,
            time: timeStr,
            status: 'open'
          });
        }
      }
      
      weekDays.push({
        date: dateStr,
        dayName,
        slots
      });
    }
    
    return weekDays;
  }, [currentDate, bookingEvents]);

  // Calculate month view data
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Fill in days from previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, bookings: 0 });
    }
    
    // Fill in days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const bookingsForDay = bookingEvents.filter(event => {
        const eventDate = event.start.split('T')[0];
        return eventDate === dateStr;
      }).length;
      
      days.push({ day, bookings: bookingsForDay, date: dateStr });
    }
    
    return days;
  }, [currentDate, bookingEvents]);

  // Get heatmap color based on booking count
  const getHeatmapColor = (bookings: number): string => {
    if (bookings === 0) return '';
    if (bookings === 1) return '';
    if (bookings === 2) return '';
    if (bookings === 3) return '';
    if (bookings >= 4) return '';
    return '';
  };

  // Get inline style for heatmap color
  const getHeatmapStyle = (bookings: number): React.CSSProperties => {
    if (bookings === 0) return { backgroundColor: '#ffffff' };
    if (bookings === 1) return { backgroundColor: '#dbeafe' }; // blue-100
    if (bookings === 2) return { backgroundColor: '#93c5fd' }; // blue-300
    if (bookings === 3) return { backgroundColor: '#60a5fa' }; // blue-400
    if (bookings >= 4) return { backgroundColor: '#2563eb', color: '#ffffff' }; // blue-600
    return { backgroundColor: '#ffffff' };
  };

  // Get text color for heatmap
  const getHeatmapTextColor = (bookings: number): string => {
    return bookings >= 4 ? 'text-white' : 'text-gray-900';
  };

  // Get badge color for heatmap
  const getHeatmapBadgeColor = (bookings: number): string => {
    if (bookings >= 4) return 'bg-white text-blue-600 hover:bg-gray-100';
    if (bookings >= 3) return 'bg-blue-50 text-blue-700 hover:bg-blue-100';
    if (bookings >= 2) return 'bg-blue-50 text-blue-600 hover:bg-blue-100';
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderWeekView = () => (
    <div className="space-y-3">
      {/* Week Stats Summary - Moved to top in 1 row */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-blue-600">
              {calendarData.reduce((acc, day) => 
                acc + day.slots.filter(s => s.status === 'booked').length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Booked Slots</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-green-600">
              {calendarData.reduce((acc, day) => 
                acc + day.slots.filter(s => s.status === 'open').length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Available Slots</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-yellow-600">
              {calendarData.reduce((acc, day) => 
                acc + day.slots.filter(s => s.status === 'hold').length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">On Hold</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-red-600">
              {calendarData.reduce((acc, day) => 
                acc + day.slots.filter(s => s.status === 'cancelled').length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Time slots grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
        {calendarData.map((day) => (
          <Card key={day.date} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <div className="text-center">
                <p className="font-semibold">{day.dayName}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(day.date).getDate()}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "w-full p-2 rounded-lg text-left transition-colors text-xs",
                    getStatusColor(slot.status)
                  )}
                >
                  <div className="font-medium">{slot.time}</div>
                  {slot.customer && (
                    <div className="truncate">{slot.customer}</div>
                  )}
                  {slot.service && (
                    <div className="truncate text-xs opacity-75">{slot.service}</div>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderMonthView = () => (
    <div className="space-y-3">
      {/* Month Stats Summary - Moved to top */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-blue-600">
              {monthData.reduce((acc, day) => acc + day.bookings, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-green-600">
              {monthData.filter(day => day.bookings > 0 && day.day !== null).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-purple-600">
              {(monthData.reduce((acc, day) => acc + day.bookings, 0) / 
                monthData.filter(d => d.day !== null).length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Avg Bookings/Day</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-orange-600">
              {Math.max(...monthData.map(d => d.bookings))}
            </div>
            <p className="text-xs text-muted-foreground">Peak Day Bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Legend - Moved to top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Booking Density</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: '#ffffff' }} />
              <span className="text-sm">None</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border" style={{ backgroundColor: '#dbeafe' }} />
              <span className="text-sm">Light (1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border" style={{ backgroundColor: '#93c5fd' }} />
              <span className="text-sm">Moderate (2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border" style={{ backgroundColor: '#60a5fa' }} />
              <span className="text-sm">Moderate (3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border flex items-center justify-center" style={{ backgroundColor: '#2563eb' }}>
                <span className="text-white text-xs font-bold">4+</span>
              </div>
              <span className="text-sm">Busy</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {/* Calendar headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-medium text-sm">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {monthData.map((dayData, i) => {
              const isCurrentMonth = dayData.day !== null;
              const isToday = dayData.date === new Date().toISOString().split('T')[0];
              
              return (
                <div
                  key={i}
                  style={isCurrentMonth ? getHeatmapStyle(dayData.bookings) : { backgroundColor: '#f3f4f6' }}
                  className={cn(
                    "p-2 min-h-[80px] border rounded-lg transition-all",
                    isCurrentMonth && dayData.bookings > 0 && "cursor-pointer hover:opacity-90",
                    isToday && "ring-2 ring-primary ring-offset-1"
                  )}
                  onClick={() => {
                    if (isCurrentMonth && dayData.bookings > 0) {
                      const dayBookings = bookingEvents.filter(event => {
                        const eventDate = event.start.split('T')[0];
                        return eventDate === dayData.date;
                      });
                      setSelectedDayBookings({
                        date: dayData.date,
                        bookings: dayBookings
                      });
                    }
                  }}
                >
                  {isCurrentMonth && (
                    <>
                      <div className={cn(
                        "text-xs font-semibold mb-1",
                        getHeatmapTextColor(dayData.bookings)
                      )}>
                        {dayData.day}
                      </div>
                      {dayData.bookings > 0 && (
                        <div className="space-y-0.5">
                          <div className={cn(
                            "text-[10px] font-medium",
                            getHeatmapTextColor(dayData.bookings)
                          )}>
                            {dayData.bookings} {dayData.bookings === 1 ? 'booking' : 'bookings'}
                          </div>
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-[10px] h-4 px-1.5",
                              getHeatmapBadgeColor(dayData.bookings)
                            )}
                          >
                            {dayData.bookings >= 4 ? 'Busy' : dayData.bookings >= 2 ? 'Moderate' : 'Light'}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDayView = () => {
    // Generate hourly time slots from 8 AM to 8 PM
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
      const hour = i + 8;
      return {
        hour,
        time: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
        time24: `${hour.toString().padStart(2, '0')}:00`
      };
    });

    // Get bookings for the current date
    const currentDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    const dayBookings = bookingEvents.filter(event => event.start.startsWith(currentDateStr));

    // Parse bookings to get time and details
    const parsedBookings = dayBookings.map(booking => {
      const startTime = new Date(booking.start);
      const endTime = new Date(booking.end);
      const [, customerName] = booking.title.split(' - ');
      const service = booking.title.split(' - ')[0];
      
      return {
        ...booking,
        startHour: startTime.getHours(),
        startMinute: startTime.getMinutes(),
        endHour: endTime.getHours(),
        endMinute: endTime.getMinutes(),
        customerName,
        service,
        startTime: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        endTime: endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        duration: (endTime.getTime() - startTime.getTime()) / (1000 * 60) // in minutes
      };
    });

    return (
      <div className="space-y-3">
        {/* Day Stats Summary */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">
                {parsedBookings.length}
              </div>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">
                {13 - parsedBookings.length}
              </div>
              <p className="text-xs text-muted-foreground">Available Hours</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-purple-600">
                {parsedBookings.reduce((acc, b) => acc + b.duration, 0)}m
              </div>
              <p className="text-xs text-muted-foreground">Total Duration</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-orange-600">
                {parsedBookings.length > 0 
                  ? `${((parsedBookings.length / 13) * 100).toFixed(0)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">Occupancy Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSlots.map((slot) => {
                // Find bookings that overlap with this hour
                const hourBookings = parsedBookings.filter(b => 
                  b.startHour === slot.hour || 
                  (b.startHour < slot.hour && b.endHour > slot.hour)
                );

                return (
                  <div key={slot.time} className="flex gap-3 min-h-[60px]">
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 text-sm font-medium text-muted-foreground pt-1">
                      {slot.time}
                    </div>

                    {/* Booking Slot */}
                    <div className="flex-1 relative">
                      {hourBookings.length > 0 ? (
                        hourBookings.map((booking, idx) => {
                          // Only show the booking card at its start hour
                          if (booking.startHour !== slot.hour) return null;

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border-l-4 bg-blue-50 border-blue-500 cursor-pointer hover:bg-blue-100 transition-colors"
                              style={{
                                borderLeftColor: booking.backgroundColor
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-sm">{booking.customerName}</div>
                                  <div className="text-xs text-muted-foreground">{booking.service}</div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {booking.startTime} - {booking.endTime}
                                    </span>
                                  </div>
                                </div>
                                <Badge 
                                  className="text-[10px]"
                                  style={{ backgroundColor: booking.backgroundColor }}
                                >
                                  {booking.duration}m
                                </Badge>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors">
                          Available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
      >
        <div>
          <h1 className="text-2xl font-bold">Calendar & Bookings</h1>
          <p className="text-muted-foreground">Manage your availability and bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onNavigate('bookings')}>
            <Eye className="h-4 w-4 mr-2" />
            View All Bookings
          </Button>
          <Button onClick={() => {
            const today = new Date();
            setNewBooking({
              customer_name: '',
              customer_phone: '',
              customer_email: '',
              booking_date: today.toISOString().split('T')[0],
              booking_time: '10:00',
              service_id: '',
              party_size: 1,
              total_price: '',
              notes: ''
            });
            setShowAddBooking(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </Button>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
      >
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[150px] text-center">
                {formatDate(currentDate)}
              </h2>
              <Button variant="outline" size="sm" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>

            {/* View mode and filters */}
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="emma">Emma</SelectItem>
                  <SelectItem value="alex">Alex</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Calendar Content */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsContent value="week">
          {renderWeekView()}
        </TabsContent>
        <TabsContent value="month">
          {renderMonthView()}
        </TabsContent>
        <TabsContent value="day">
          {renderDayView()}
        </TabsContent>
      </Tabs>

      {/* Slot Details Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedSlot.time} Slot</span>
                <Badge variant={selectedSlot.status === 'open' ? 'secondary' : 'default'}>
                  {getStatusLabel(selectedSlot.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSlot.customer && (
                <div>
                  <p className="text-sm font-medium">Customer</p>
                  <p className="text-sm text-muted-foreground">{selectedSlot.customer}</p>
                </div>
              )}
              
              {selectedSlot.service && (
                <div>
                  <p className="text-sm font-medium">Service</p>
                  <p className="text-sm text-muted-foreground">{selectedSlot.service}</p>
                </div>
              )}
              
              {selectedSlot.staff && (
                <div>
                  <p className="text-sm font-medium">Staff</p>
                  <p className="text-sm text-muted-foreground">{selectedSlot.staff}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedSlot.status === 'open' && (
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      const [date, hour] = selectedSlot.id.split('-');
                      const hourNum = parseInt(hour);
                      const time24 = `${hourNum.toString().padStart(2, '0')}:00`;
                      setNewBooking({
                        customer_name: '',
                        customer_phone: '',
                        customer_email: '',
                        booking_date: date,
                        booking_time: time24,
                        service_id: '',
                        party_size: 1,
                        total_price: '',
                        notes: ''
                      });
                      setShowAddBooking(true);
                      setSelectedSlot(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Book Slot
                  </Button>
                )}
                
                {selectedSlot.status !== 'open' && selectedSlot.customer && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        // Try to find booking by ID first (most reliable)
                        let booking = selectedSlot.bookingId 
                          ? bookings.find(b => b.id === selectedSlot.bookingId)
                          : null;
                        
                        // Fallback: find by date and time
                        if (!booking) {
                          const [date, hour] = selectedSlot.id.split('-');
                          booking = bookings.find(b => {
                            const bookingDate = b.booking_date;
                            const [bookingHours] = b.booking_time.split(':').map(Number);
                            return bookingDate === date && bookingHours === parseInt(hour);
                          });
                        }
                        
                        // Additional fallback: find by customer name and date
                        if (!booking && selectedSlot.customer) {
                          const [date] = selectedSlot.id.split('-');
                          booking = bookings.find(b => 
                            b.customer_name === selectedSlot.customer && 
                            b.booking_date === date
                          );
                        }
                        
                        if (booking) {
                          setEditingBooking(booking);
                          setShowEditBooking(true);
                          setSelectedSlot(null);
                        } else {
                          console.error('Booking lookup failed:', {
                            slotId: selectedSlot.id,
                            bookingId: selectedSlot.bookingId,
                            customer: selectedSlot.customer,
                            bookingsCount: bookings.length,
                            bookings: bookings.map(b => ({ id: b.id, date: b.booking_date, time: b.booking_time, customer: b.customer_name }))
                          });
                          toast.error('Booking not found');
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={async () => {
                        // Try to find booking by ID first (most reliable)
                        let booking = selectedSlot.bookingId 
                          ? bookings.find(b => b.id === selectedSlot.bookingId)
                          : null;
                        
                        // Fallback: find by date and time
                        if (!booking) {
                          const [date, hour] = selectedSlot.id.split('-');
                          booking = bookings.find(b => {
                            const bookingDate = b.booking_date;
                            const [bookingHours] = b.booking_time.split(':').map(Number);
                            return bookingDate === date && bookingHours === parseInt(hour);
                          });
                        }
                        
                        // Additional fallback: find by customer name and date
                        if (!booking && selectedSlot.customer) {
                          const [date] = selectedSlot.id.split('-');
                          booking = bookings.find(b => 
                            b.customer_name === selectedSlot.customer && 
                            b.booking_date === date
                          );
                        }
                        
                        if (booking && confirm('Are you sure you want to cancel this booking?')) {
                          try {
                            await apiService.cancelBooking(booking.id);
                            toast.success('Booking cancelled');
                            fetchBookings();
                            setSelectedSlot(null);
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to cancel booking');
                          }
                        } else if (!booking) {
                          console.error('Booking lookup failed for cancel:', {
                            slotId: selectedSlot.id,
                            bookingId: selectedSlot.bookingId,
                            customer: selectedSlot.customer,
                            bookingsCount: bookings.length
                          });
                          toast.error('Booking not found');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSelectedSlot(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Day Bookings Modal */}
      {selectedDayBookings && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDayBookings(null)}
        >
          <Card 
            className="w-full max-w-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    Bookings for {new Date(selectedDayBookings.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </CardTitle>
                  <Badge variant="secondary">
                    {selectedDayBookings.bookings.length} {selectedDayBookings.bookings.length === 1 ? 'booking' : 'bookings'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={() => setSelectedDayBookings(null)}
                >
                  <span className="sr-only">Close</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto p-6" style={{ maxHeight: '400px' }}>
              <div className="space-y-3">
                {selectedDayBookings.bookings.map((bookingEvent, index) => {
                  const { service, customer } = parseBookingTitle(bookingEvent.title);
                  const startTime = new Date(bookingEvent.start);
                  const endTime = new Date(bookingEvent.end);
                  
                  // Find the actual booking from the bookings array
                  const actualBooking = bookings.find(b => {
                    // Match by ID first (most reliable)
                    if (b.id === bookingEvent.id) return true;
                    // Fallback: match by customer name, date, and time
                    const eventStart = new Date(bookingEvent.start);
                    const eventDateStr = eventStart.toISOString().split('T')[0];
                    const eventHours = eventStart.getHours();
                    const [bookingHours] = b.booking_time.split(':').map(Number);
                    return b.customer_name === customer && 
                           b.booking_date === eventDateStr &&
                           bookingHours === eventHours;
                  });
                  
                  return (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      style={{ borderLeftWidth: '4px', borderLeftColor: bookingEvent.backgroundColor }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{customer}</h4>
                          <p className="text-sm text-muted-foreground">{service}</p>
                        </div>
                        <Badge 
                          style={{ 
                            backgroundColor: bookingEvent.backgroundColor + '20',
                            color: bookingEvent.backgroundColor,
                            borderColor: bookingEvent.backgroundColor
                          }}
                          className="border"
                        >
                          {actualBooking?.status || 'Confirmed'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {' - '}
                            {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Staff: Emma</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        {actualBooking && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditingBooking(actualBooking);
                                setShowEditBooking(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs"
                              onClick={async () => {
                                if (confirm('Are you sure you want to cancel this booking?')) {
                                  try {
                                    await apiService.cancelBooking(actualBooking.id);
                                    toast.success('Booking cancelled');
                                    fetchBookings();
                                    setSelectedDayBookings(null);
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to cancel booking');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <div className="p-4 border-t flex-shrink-0 bg-background">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSelectedDayBookings(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Booking Modal */}
      {showAddBooking && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddBooking(false)}
        >
          <Card 
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add New Booking</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Create a new booking for a customer</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddBooking(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={newBooking.customer_name}
                onChange={(e) => setNewBooking({ ...newBooking, customer_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone *</Label>
              <Input
                value={newBooking.customer_phone}
                onChange={(e) => setNewBooking({ ...newBooking, customer_phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Email</Label>
              <Input
                type="email"
                value={newBooking.customer_email}
                onChange={(e) => setNewBooking({ ...newBooking, customer_email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newBooking.booking_date}
                  onChange={(e) => setNewBooking({ ...newBooking, booking_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={newBooking.booking_time}
                  onChange={(e) => setNewBooking({ ...newBooking, booking_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={newBooking.service_id || undefined}
                  onValueChange={(value) => setNewBooking({ ...newBooking, service_id: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name} {service.price ? `($${service.price})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff</Label>
                <Select
                  value={newBooking.staff_id || undefined}
                  onValueChange={(value) => setNewBooking({ ...newBooking, staff_id: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Party Size</Label>
              <Input
                type="number"
                min="1"
                value={newBooking.party_size}
                onChange={(e) => setNewBooking({ ...newBooking, party_size: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newBooking.total_price}
                onChange={(e) => setNewBooking({ ...newBooking, total_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                className="flex-1"
                onClick={async () => {
                  if (!newBooking.customer_name || !newBooking.customer_phone || !newBooking.booking_date || !newBooking.booking_time) {
                    toast.error('Please fill in all required fields');
                    return;
                  }
                  const merchantId = user?.merchant_id || user?.id;
                  if (!merchantId) {
                    toast.error('Merchant ID not found');
                    return;
                  }
                  try {
                    await apiService.createBooking({
                      merchant_id: merchantId,
                      service_id: newBooking.service_id ? parseInt(newBooking.service_id) : undefined,
                      staff_id: newBooking.staff_id ? parseInt(newBooking.staff_id) : undefined,
                      customer_name: newBooking.customer_name,
                      customer_phone: newBooking.customer_phone,
                      customer_email: newBooking.customer_email || undefined,
                      booking_date: newBooking.booking_date,
                      booking_time: newBooking.booking_time,
                      party_size: newBooking.party_size,
                      total_price: newBooking.total_price ? parseFloat(newBooking.total_price) : undefined,
                      notes: newBooking.notes || undefined
                    });
                    toast.success('Booking created successfully');
                    setShowAddBooking(false);
                    setNewBooking({
                      customer_name: '',
                      customer_phone: '',
                      customer_email: '',
                      booking_date: '',
                      booking_time: '',
                      service_id: '',
                      staff_id: '',
                      party_size: 1,
                      total_price: '',
                      notes: ''
                    });
                    fetchBookings();
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to create booking');
                  }
                }}
              >
                Create Booking
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddBooking(false)}>
                Cancel
              </Button>
            </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditBooking && editingBooking && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowEditBooking(false);
            setEditingBooking(null);
          }}
        >
          <Card 
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Edit Booking</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Update booking details</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditBooking(false);
                    setEditingBooking(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={editingBooking.customer_name}
                  onChange={(e) => setEditingBooking({ ...editingBooking, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone *</Label>
                <Input
                  value={editingBooking.customer_phone}
                  onChange={(e) => setEditingBooking({ ...editingBooking, customer_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={editingBooking.customer_email || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, customer_email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={editingBooking.booking_date}
                    onChange={(e) => setEditingBooking({ ...editingBooking, booking_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={editingBooking.booking_time}
                    onChange={(e) => setEditingBooking({ ...editingBooking, booking_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select
                    value={editingBooking.service_id?.toString() || undefined}
                    onValueChange={(value) => setEditingBooking({ ...editingBooking, service_id: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} {service.price ? `($${service.price})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <Select
                    value={editingBooking.staff_id?.toString() || undefined}
                    onValueChange={(value) => setEditingBooking({ ...editingBooking, staff_id: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Party Size</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingBooking.party_size}
                  onChange={(e) => setEditingBooking({ ...editingBooking, party_size: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingBooking.total_price || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, total_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingBooking.notes || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={async () => {
                    if (!editingBooking.customer_name || !editingBooking.customer_phone || !editingBooking.booking_date || !editingBooking.booking_time) {
                      toast.error('Please fill in all required fields');
                      return;
                    }
                    try {
                      await apiService.updateBooking(editingBooking.id, {
                        customer_name: editingBooking.customer_name,
                        customer_phone: editingBooking.customer_phone,
                        customer_email: editingBooking.customer_email,
                        booking_date: editingBooking.booking_date,
                        booking_time: editingBooking.booking_time,
                        service_id: editingBooking.service_id,
                        staff_id: editingBooking.staff_id,
                        party_size: editingBooking.party_size,
                        total_price: editingBooking.total_price,
                        notes: editingBooking.notes
                      });
                      toast.success('Booking updated successfully');
                      setShowEditBooking(false);
                      setEditingBooking(null);
                      fetchBookings();
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to update booking');
                    }
                  }}
                >
                  Update Booking
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowEditBooking(false);
                    setEditingBooking(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}