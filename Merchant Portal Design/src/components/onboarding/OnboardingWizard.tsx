import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Upload, 
  Plus, 
  Trash2,
  Camera,
  CheckCircle
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

// Updated Interface to include Step 5 fields
interface BusinessData {
  name: string;
  industry: string;
  address: string;
  phone: string;
  about: string;
  policies: string;
  cancellationPolicy: string;
  depositRequired: boolean;
  bookingFeeAmount: number;
  services: any[];
  staff: any[];
  // New fields for Step 5
  breakTime: number;
  bookAhead: number;
  workingHours: any; 
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // State for Image Files
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // State for Text Data
  const [businessData, setBusinessData] = useState<BusinessData>({
    name: '',
    industry: '',
    address: '',
    phone: '',
    about: '',
    policies: '',
    cancellationPolicy: '',
    depositRequired: false,
    bookingFeeAmount: 0,
    services: [],
    staff: [],
    // Default values for Step 5
    breakTime: 15,
    bookAhead: 30,
    workingHours: {
      Monday: { open: true, start: '09:00 AM', end: '06:00 PM' },
      Tuesday: { open: true, start: '09:00 AM', end: '06:00 PM' },
      Wednesday: { open: true, start: '09:00 AM', end: '06:00 PM' },
      Thursday: { open: true, start: '09:00 AM', end: '06:00 PM' },
      Friday: { open: true, start: '09:00 AM', end: '06:00 PM' },
      Saturday: { open: true, start: '09:00 AM', end: '06:00 PM' },
      Sunday: { open: false, start: '09:00 AM', end: '06:00 PM' },
    }
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const submitDataToBackend = async () => {
    try {
      const formData = new FormData();

      // 1. Append files
      if (logoFile) formData.append('logo', logoFile);
      if (coverFile) formData.append('cover_photo', coverFile);

      // Handle Staff Photos
  // We need to tell the backend which file belongs to which staff member.
  // We will add a 'photoIndex' to the staff data that points to the file in the upload array.
  let photoCounter = 0;
  const staffWithPhotoIndices = businessData.staff.map(member => {
    if (member.photoFile) {
      formData.append('staff_photos', member.photoFile);
      return { ...member, photoIndex: photoCounter++ };
    }
    return { ...member, photoIndex: -1 };
  });

  // 2. Prepare text data
  const user = localStorage.getItem('user');
  const userData = user ? JSON.parse(user) : null;

  const allData = {
    name: businessData.name,
    industry: businessData.industry,
    address: businessData.address,
    phone: businessData.phone,
    about: businessData.about,
    policies: businessData.policies,
    cancellationPolicy: businessData.cancellationPolicy,
    depositRequired: businessData.depositRequired,
    bookingFeeAmount: businessData.bookingFeeAmount, // From Step 2
    services: businessData.services,
    staff: staffWithPhotoIndices, // Use the updated staff list
    breakTime: businessData.breakTime,
    bookAhead: businessData.bookAhead,
    workingHours: businessData.workingHours,
    user_id: userData?.id || userData?.merchant_id 
  };

      formData.append('data', JSON.stringify(allData));

      // 3. Send to Backend
      const response = await fetch('http://localhost:5000/api/onboard/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Merchant Created! ID:", result.merchantId);
        alert("Setup Complete! Your business has been created. Please log in to access your dashboard.");
        onComplete(); 
      } else {
        alert("Error saving data: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Failed to connect to server. Is the backend terminal running?");
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      submitDataToBackend(); 
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addService = () => {
    const newService = {
  id: Date.now(),
  name: '',
  duration: '', // Empty string allows placeholder to show
  price: '',    // Empty string allows placeholder to show
  description: ''
};
    setBusinessData(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const addStaff = () => {
    const newStaff = {
  id: Date.now(),
  name: '',
  bio: '',
  services: [],
  photoFile: null as File | null, // Store the file
  photoPreview: '' // Store the preview URL
};
    setBusinessData(prev => ({
      ...prev,
      staff: [...prev.staff, newStaff]
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Business Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input 
                    id="business-name" 
                    value={businessData.name}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your business name" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={businessData.industry} onValueChange={(value) => setBusinessData(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salon">Salon & Beauty</SelectItem>
                      <SelectItem value="restaurant">Restaurant & Dining</SelectItem>
                      <SelectItem value="sports">Sports & Recreation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Business Logo</Label>
                    <label 
                      htmlFor="logo-upload" 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center block cursor-pointer hover:bg-muted/50 transition-colors relative"
                    >
                      <input 
                        id="logo-upload" 
                        type="file" 
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setLogoFile(e.target.files[0]);
                          }
                        }}
                      />
                      {logoFile ? (
                        <div className="text-sm text-green-600 font-medium flex flex-col items-center">
                           <CheckCircle className="h-8 w-8 mb-2" />
                           {logoFile.name}
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload logo</p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Cover Photo Upload */}
                  <div className="space-y-2">
                    <Label>Cover Photo</Label>
                    <label 
                      htmlFor="cover-upload" 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center block cursor-pointer hover:bg-muted/50 transition-colors relative"
                    >
                      <input 
                        id="cover-upload" 
                        type="file" 
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setCoverFile(e.target.files[0]);
                          }
                        }}
                      />
                      {coverFile ? (
                        <div className="text-sm text-green-600 font-medium flex flex-col items-center">
                           <CheckCircle className="h-8 w-8 mb-2" />
                           {coverFile.name}
                        </div>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload cover</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={businessData.address}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main St, City, State" 
                  />
                </div>

                <div className="space-y-2">
  <Label htmlFor="phone">Phone Number</Label>
  <Input 
    id="phone" 
    value={businessData.phone}
    onChange={(e) => setBusinessData(prev => ({ ...prev, phone: e.target.value }))}
    placeholder="+1 (555) 000-0000" 
  />
</div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">About & Policies</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="about">About Your Business</Label>
                  <Textarea 
                    id="about"
                    value={businessData.about}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, about: e.target.value }))}
                    placeholder="Tell customers about your business, what makes you special..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policies">Things to Know Before Booking</Label>
                  <Textarea 
                    id="policies"
                    value={businessData.policies}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, policies: e.target.value }))}
                    placeholder="Important information for customers before they book..."
                    className="min-h-[100px]"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Booking Policies</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cancellation">Cancellation & No-show Policy</Label>
                    <Textarea 
                      id="cancellation"
                      value={businessData.cancellationPolicy}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                      placeholder="Describe your cancellation policy and no-show fees..."
                    />
                  </div>

                  <div className="space-y-4">
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label>Require Booking Fee</Label>
      <p className="text-sm text-muted-foreground">
        Require customers to pay a fee when booking
      </p>
    </div>
    <Switch 
      checked={businessData.depositRequired}
      onCheckedChange={(checked) => setBusinessData(prev => ({ ...prev, depositRequired: checked }))}
    />
  </div>

  {businessData.depositRequired && (
    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
      <Label className="whitespace-nowrap">Fee Amount ($)</Label>
      <Input 
        type="number"
        className="max-w-[150px]"
        placeholder="0.00"
        value={businessData.bookingFeeAmount}
        onChange={(e) => setBusinessData(prev => ({ ...prev, bookingFeeAmount: parseFloat(e.target.value) || 0 }))}
      />
    </div>
  )}
</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Add the services you offer</p>
                  <Button onClick={addService} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
                
                {businessData.services.map((service, index) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Service Name</Label>
                          <Input 
                              value={service.name}
                              onChange={(e) => {
                                  const newServices = [...businessData.services];
                                  newServices[index].name = e.target.value;
                                  setBusinessData(prev => ({ ...prev, services: newServices }));
                              }}
                              placeholder="e.g., Haircut" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input 
    type="number" 
    value={service.duration}
    onChange={(e) => {
        const newServices = [...businessData.services];
        // Allow empty string or parse to integer
        newServices[index].duration = e.target.value === '' ? '' : parseInt(e.target.value);
        setBusinessData(prev => ({ ...prev, services: newServices }));
    }}
    placeholder="0" 
/>
                        </div>
                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input 
    type="number" 
    value={service.price}
    onChange={(e) => {
        const newServices = [...businessData.services];
        // Allow empty string or parse to float (for cents)
        newServices[index].price = e.target.value === '' ? '' : parseFloat(e.target.value);
        setBusinessData(prev => ({ ...prev, services: newServices }));
    }}
    placeholder="0" 
/>
                        </div>
                        <div className="flex items-end">
                          <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                  const newServices = businessData.services.filter((_, i) => i !== index);
                                  setBusinessData(prev => ({ ...prev, services: newServices }));
                              }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {businessData.services.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">No services added yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Team Members</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Add your team members</p>
                  <Button onClick={addStaff} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
                
                {businessData.staff.map((member, index) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 1. Compact Photo Upload Section */}
                        <div className="flex-shrink-0">
                          <label className="cursor-pointer block group relative">
                            {/* Force hide the native input using style display:none */}
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  const newStaff = [...businessData.staff];
                                  newStaff[index].photoFile = file;
                                  newStaff[index].photoPreview = URL.createObjectURL(file);
                                  setBusinessData(prev => ({ ...prev, staff: newStaff }));
                                }
                              }}
                            />
                            
                            {/* Visual Circle Trigger */}
                            <div className="h-16 w-16 rounded-full bg-muted border-2 border-dashed border-muted-foreground/25 hover:border-primary flex flex-col items-center justify-center overflow-hidden transition-colors">
                              {member.photoPreview ? (
                                <img src={member.photoPreview} alt={member.name} className="h-full w-full object-cover" />
                              ) : (
                                <>
                                  <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                                  <span className="text-[10px] text-muted-foreground leading-none">Upload</span>
                                </>
                              )}
                            </div>
                            
                            {/* Plus icon overlay on hover */}
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Plus className="h-6 w-6 text-white" />
                            </div>
                          </label>
                        </div>

                        {/* 2. Text Inputs - Extended to the left with flex-1 */}
                        <div className="flex-1 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <Input 
                                placeholder="e.g. Sarah Jones" 
                                value={member.name}
                                onChange={(e) => {
                                    const newStaff = [...businessData.staff];
                                    newStaff[index].name = e.target.value;
                                    setBusinessData(prev => ({ ...prev, staff: newStaff }));
                                }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Role / Bio</Label>
                            <Textarea 
                                placeholder="e.g. Senior Stylist, specializes in color..." 
                                className="min-h-[60px] resize-none" 
                                value={member.bio}
                                onChange={(e) => {
                                    const newStaff = [...businessData.staff];
                                    newStaff[index].bio = e.target.value;
                                    setBusinessData(prev => ({ ...prev, staff: newStaff }));
                                }}
                            />
                          </div>
                        </div>

                        {/* 3. Delete Button */}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-muted-foreground hover:text-destructive mt-6"
                          onClick={() => {
                              const newStaff = businessData.staff.filter((_, i) => i !== index);
                              setBusinessData(prev => ({ ...prev, staff: newStaff }));
                          }}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {businessData.staff.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">No team members added yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Schedule & Availability</h3>
              
              {/* CHANGE HERE: 'items-center' puts the right box in the middle vertically */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                
                {/* Left Column: Working Hours */}
                <div className="space-y-4">
                  <h4 className="font-medium">Working Hours</h4>
                  <div className="space-y-3">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-3 text-sm">
                        <div className="w-20 font-medium">
                          <Label className="cursor-pointer">{day}</Label>
                        </div>
                        <Switch 
                          checked={businessData.workingHours[day]?.open}
                          onCheckedChange={(checked) => {
                            setBusinessData(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day]: { ...prev.workingHours[day], open: checked }
                              }
                            }));
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Input 
                            value={businessData.workingHours[day]?.start}
                            onChange={(e) => {
                              setBusinessData(prev => ({
                                ...prev,
                                workingHours: {
                                  ...prev.workingHours,
                                  [day]: { ...prev.workingHours[day], start: e.target.value }
                                }
                              }));
                            }}
                            className="h-8 w-24 px-2" 
                            disabled={!businessData.workingHours[day]?.open}
                          />
                          <span className="text-muted-foreground text-xs">to</span>
                          <Input 
                            value={businessData.workingHours[day]?.end}
                             onChange={(e) => {
                              setBusinessData(prev => ({
                                ...prev,
                                workingHours: {
                                  ...prev.workingHours,
                                  [day]: { ...prev.workingHours[day], end: e.target.value }
                                }
                              }));
                            }}
                            className="h-8 w-24 px-2"
                            disabled={!businessData.workingHours[day]?.open}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Booking Settings */}
                <div className="space-y-6 bg-muted/30 p-6 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                     Booking Settings
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Break between bookings (minutes)</Label>
                      <Input 
                        type="number" 
                        value={businessData.breakTime}
                        onChange={(e) => setBusinessData(prev => ({ ...prev, breakTime: parseInt(e.target.value) || 0 }))}
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Time automatically blocked after every appointment to clean or rest.
                      </p>
                    </div>

                    <Separator className="bg-border/60" />

                    <div className="space-y-2">
                      <Label>Book ahead limit (days)</Label>
                      <Input 
                        type="number" 
                        value={businessData.bookAhead}
                        onChange={(e) => setBusinessData(prev => ({ ...prev, bookAhead: parseInt(e.target.value) || 0 }))}
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        How far in the future customers can make a booking.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Setup Your Business</CardTitle>
                <CardDescription>
                  Complete your profile to start receiving automated bookings
                </CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </div>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          
          <CardContent>
            {renderStep()}
          </CardContent>
          
          <div className="flex justify-between p-6 border-t">
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep === totalSteps ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}