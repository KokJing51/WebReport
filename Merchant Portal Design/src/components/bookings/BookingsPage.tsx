import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { 
  Search, 
  Filter, 
  Download, 
  MessageSquare, 
  Calendar,
  User,
  DollarSign,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  RotateCcw,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../ui/utils';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface BookingsPageProps {
  onNavigate: (page: string) => void;
  user?: any;
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
  created_at: string;
}

const mockBookings: Booking[] = [
  {
    id: 'BK001',
    customer: {
      name: 'Sarah Johnson',
      phone: '+1 (555) 123-4567',
      email: 'sarah.johnson@email.com'
    },
    service: 'Haircut & Style',
    staff: 'Emma',
    date: '2024-03-20',
    time: '10:00 AM',
    duration: 60,
    price: 50,
    status: 'confirmed',
    channel: 'whatsapp',
    notes: 'Prefers shorter length, similar to previous style',
    createdAt: '2024-03-18T14:30:00Z'
  },
  {
    id: 'BK002',
    customer: {
      name: 'Mike Chen',
      phone: '+1 (555) 234-5678',
      email: 'mike.chen@email.com'
    },
    service: 'Beard Trim',
    staff: 'Alex',
    date: '2024-03-20',
    time: '11:30 AM',
    duration: 30,
    price: 25,
    status: 'pending',
    channel: 'whatsapp',
    createdAt: '2024-03-18T15:45:00Z'
  },
  {
    id: 'BK003',
    customer: {
      name: 'Lisa Wong',
      phone: '+1 (555) 345-6789',
      email: 'lisa.wong@email.com'
    },
    service: 'Hair Coloring',
    staff: 'Emma',
    date: '2024-03-21',
    time: '1:00 PM',
    duration: 120,
    price: 80,
    status: 'confirmed',
    channel: 'web',
    notes: 'First time customer, discussed blonde highlights',
    createdAt: '2024-03-17T10:15:00Z'
  },
  {
    id: 'BK004',
    customer: {
      name: 'John Doe',
      phone: '+1 (555) 456-7890',
      email: 'john.doe@email.com'
    },
    service: 'Haircut',
    staff: 'Alex',
    date: '2024-03-19',
    time: '2:00 PM',
    duration: 45,
    price: 35,
    status: 'cancelled',
    channel: 'whatsapp',
    createdAt: '2024-03-16T09:20:00Z'
  },
  {
    id: 'BK005',
    customer: {
      name: 'Anna Taylor',
      phone: '+1 (555) 567-8901',
      email: 'anna.taylor@email.com'
    },
    service: 'Deep Conditioning',
    staff: 'Emma',
    date: '2024-03-18',
    time: '9:00 AM',
    duration: 45,
    price: 40,
    status: 'completed',
    channel: 'whatsapp',
    createdAt: '2024-03-15T16:30:00Z'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    case 'no-show':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getChannelIcon = (channel: string) => {
  return channel === 'whatsapp' ? (
    <MessageSquare className="h-4 w-4 text-green-600" />
  ) : (
    <Calendar className="h-4 w-4 text-blue-600" />
  );
};

export function BookingsPage({ onNavigate, user }: BookingsPageProps) {
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch bookings
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    const merchantId = user.merchant_id || user.id;
    if (!merchantId) {
      console.warn('No merchant_id or user id found');
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await apiService.getBookings({
        merchant_id: merchantId
      });
      setBookings(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch bookings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    const merchantId = user.merchant_id || user.id;
    if (!merchantId) {
      toast.error('Merchant ID not found');
      return;
    }

    try {
      const blob = await apiService.exportBookingsToCSV({
        merchant_id: merchantId
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Bookings exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export bookings');
    }
  };

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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.id.toString().includes(searchTerm.toLowerCase()) ||
                         (booking.service_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    // Note: channel filter removed as it's not in the database schema
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, channelFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(paginatedBookings.map(b => b.id));
    } else {
      setSelectedBookings([]);
    }
  };

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    if (checked) {
      setSelectedBookings(prev => [...prev, bookingId]);
    } else {
      setSelectedBookings(prev => prev.filter(id => id !== bookingId));
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on bookings:`, selectedBookings);
    // Implement bulk actions
    setSelectedBookings([]);
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
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">Manage all your customer bookings</p>
        </div>
        <Button onClick={() => onNavigate('calendar')}>
          <Calendar className="h-4 w-4 mr-2" />
          View Calendar
        </Button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
      >
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="web">Web Portal</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Bulk Actions */}
      {selectedBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedBookings.length} booking(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('confirm')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('cancel')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('message')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Bookings Table */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInUp}
      >
      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedBookings.includes(booking.id)}
                      onCheckedChange={(checked) => handleSelectBooking(booking.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">#{booking.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.service_name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Party: {booking.party_size}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{new Date(booking.booking_date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">{booking.booking_time}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{booking.staff_name || 'N/A'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", getStatusColor(booking.status))}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="capitalize text-sm">web</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">RM {booking.total_price || '0.00'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredBookings.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} results
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Booking Detail Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
          <div className="bg-background w-full max-w-md h-full shadow-xl overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Booking Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Booking Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Booking ID</span>
                  <span className="font-mono text-sm">#{selectedBooking.id}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <Badge className={cn("capitalize", getStatusColor(selectedBooking.status))}>
                    {selectedBooking.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Customer Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedBooking.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedBooking.customer_phone}</span>
                  </div>
                  {selectedBooking.customer_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedBooking.customer_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Service Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Service Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">{selectedBooking.service_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Party Size</span>
                    <span>{selectedBooking.party_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{new Date(selectedBooking.booking_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{selectedBooking.booking_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">RM {selectedBooking.total_price || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-medium">Notes</h3>
                    <p className="text-sm text-muted-foreground">{selectedBooking.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <h3 className="font-medium">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedBooking.status === 'pending' && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={async () => {
                        try {
                          await apiService.updateBooking(selectedBooking.id, { status: 'confirmed' });
                          toast.success('Booking confirmed');
                          fetchBookings();
                          setSelectedBooking(null);
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to confirm booking');
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm
                    </Button>
                  )}
                  
                  {['confirmed', 'pending'].includes(selectedBooking.status) && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={async () => {
                          if (confirm('Are you sure you want to cancel this booking?')) {
                            try {
                              await apiService.cancelBooking(selectedBooking.id);
                              toast.success('Booking cancelled');
                              fetchBookings();
                              setSelectedBooking(null);
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to cancel booking');
                            }
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Booking History */}
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium">Booking History</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(selectedBooking.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}