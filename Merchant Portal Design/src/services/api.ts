// Merchant Portal Design/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  user?: T;
  booking?: T;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<ApiResponse<any>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, business_name?: string) {
    return this.request<ApiResponse<any>>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, business_name }),
    });
  }

  // Bookings
  async getBookings(params?: {
    merchant_id?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.merchant_id) queryParams.append('merchant_id', params.merchant_id.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request<any[]>(`/bookings${query ? `?${query}` : ''}`);
  }

  async getBooking(id: string | number) {
    return this.request<any>(`/bookings/${id}`);
  }

  async createBooking(booking: {
    merchant_id: number;
    service_id?: number;
    staff_id?: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    booking_date: string;
    booking_time: string;
    party_size?: number;
    total_price?: number;
    notes?: string;
  }) {
    return this.request<ApiResponse<any>>('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(
    id: string | number,
    updates: {
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      booking_date?: string;
      booking_time?: string;
      service_id?: number;
      staff_id?: number;
      party_size?: number;
      total_price?: number;
      notes?: string;
      status?: string;
    }
  ) {
    return this.request<ApiResponse<any>>(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async cancelBooking(id: string | number) {
    return this.request<ApiResponse<any>>(`/bookings/${id}?cancel=true`, {
      method: 'DELETE',
    });
  }

  async deleteBooking(id: string | number) {
    return this.request<ApiResponse<any>>(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  // Get services for a merchant
  async getServices(merchant_id: number) {
    return this.request<any[]>(`/merchants/${merchant_id}/services`);
  }

  // Get staff for a merchant
  async getStaff(merchant_id: number) {
    return this.request<any[]>(`/merchants/${merchant_id}/staff`);
  }

  async exportBookingsToCSV(params?: {
    merchant_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params?.merchant_id) queryParams.append('merchant_id', params.merchant_id.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const query = queryParams.toString();
    const url = `${API_BASE_URL}/bookings/export/csv${query ? `?${query}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to export bookings');
    }

    return response.blob();
  }
}

export const apiService = new ApiService();

