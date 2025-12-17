import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import logo from 'figma:asset/0b6d7a724e60d1fb0252e76f9f181438aa6ab406.png';

interface AuthPageProps {
  onLogin: (user: any) => void;
  onStartOnboarding: () => void;
}

export function AuthPage({ onLogin, onStartOnboarding }: AuthPageProps) {
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', business_name: '' });

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.login(loginData.email, loginData.password);
      if (response.success && response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Login successful!');
        onLogin(response.user);
      } else {
        toast.error(response.error || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!signupData.email || !signupData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.signup(
        signupData.email,
        signupData.password,
        signupData.business_name
      );
      if (response.success && response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Account created successfully!');
        // Redirect to onboarding instead of dashboard
        onStartOnboarding();
      } else {
        toast.error(response.error || 'Signup failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWhatsApp = () => {
    setIsConnectingWhatsApp(true);
    // Simulate API call
    setTimeout(() => {
      setIsConnectingWhatsApp(false);
      setWhatsAppConnected(true);
    }, 2000);
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
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FFE8F0 0%, #F0E6FF 50%, #E0EEFF 100%)' }}>
      <motion.div 
        className="w-full max-w-md space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Logo */}
        <motion.div className="text-center" variants={fadeInUp}>
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Fein Booking" className="h-16 w-16" style={{ mixBlendMode: 'multiply' }} />
          </div>
          <h1 className="text-2xl font-bold">Fein Booking</h1>
          <p className="text-muted-foreground">Automate your bookings with WhatsApp AI</p>
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name (Optional)</Label>
                    <Input 
                      id="business-name" 
                      placeholder="Your business name"
                      value={signupData.business_name}
                      onChange={(e) => setSignupData({ ...signupData, business_name: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                    <Input 
                      id="email-signup" 
                      type="email" 
                      placeholder="Enter your email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                    <Input 
                      id="password-signup" 
                      type="password" 
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </motion.div>

        {/* WhatsApp Connection Step */}
        <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connect WhatsApp
            </CardTitle>
            <CardDescription>
              Enable automated booking responses on WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!whatsAppConnected ? (
              <>
                <Alert>
                  <AlertDescription>
                    You'll need a Meta Cloud API key and verified phone number to enable WhatsApp automation.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="api-key">Meta Cloud API Key</Label>
                  <Input id="api-key" placeholder="YOUR_API_KEY_HERE" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp Business Phone</Label>
                  <Input id="phone" placeholder="+1234567890" />
                </div>
                <Button 
                  onClick={handleConnectWhatsApp} 
                  disabled={isConnectingWhatsApp}
                  className="w-full"
                >
                  {isConnectingWhatsApp ? 'Connecting...' : 'Connect WhatsApp'}
                </Button>
              </>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-600">WhatsApp Connected Successfully!</p>
                <p className="text-xs text-muted-foreground">Your automated booking system is ready</p>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}