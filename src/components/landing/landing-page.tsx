'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  GraduationCap, 
  Users, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Star,
  Clock,
  Globe,
  Lock,
  Menu,
  X
} from 'lucide-react';

export function LandingPage() {
  const [collegeUsername, setCollegeUsername] = useState('');
  const [isValidatingCollege, setIsValidatingCollege] = useState(false);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<{ id: string; name: string; username: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const router = useRouter();

  const validateCollege = async () => {
    if (!collegeUsername.trim()) {
      setError('College username is required');
      return;
    }

    setIsValidatingCollege(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resolve-college', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collegeUsername: collegeUsername.trim() }),
      });

      const data = await response.json();

      if (data.success && data.college) {
        setCollege(data.college);
        setError('');
      } else {
        setError(data.error || 'College not found');
        setCollege(null);
      }
    } catch (error) {
      setError('Failed to validate college');
      setCollege(null);
    } finally {
      setIsValidatingCollege(false);
    }
  };

  const handleContinue = () => {
    if (college) {
      sessionStorage.setItem('selectedCollege', JSON.stringify(college));
      router.push('/auth/login');
    }
  };

  const handleCollegeRegistration = () => {
    router.push('/college/register');
  };

  const handleGetStarted = () => {
    // Scroll to college selection section
    const element = document.getElementById('college-selection');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">ExamSaaS</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Contact
              </a>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button 
                size="sm"
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 py-4 space-y-4">
                <div className="space-y-2">
                  <a 
                    href="#features" 
                    className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Features
                  </a>
                  <a 
                    href="#pricing" 
                    className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </a>
                  <a 
                    href="#contact" 
                    className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Contact
                  </a>
                </div>
                <div className="pt-4 border-t space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      router.push('/auth/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      handleGetStarted();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Trusted by 500+ Educational Institutions</span>
            <span className="sm:hidden">500+ Institutions</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            <span className="block">Secure Exam Management</span>
            <span className="block text-blue-600">Made Simple</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
            Transform your institution's examination process with our comprehensive, 
            multi-tenant platform designed for colleges, universities, and educational organizations.
          </p>

          {/* Main CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
            <Button 
              size="lg"
              onClick={handleCollegeRegistration}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Building2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Sign Up Your Institution</span>
              <span className="sm:hidden">Sign Up Institution</span>
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              onClick={handleGetStarted}
              className="w-full sm:w-auto border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-300"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 px-4">
            <div className="flex items-center justify-center sm:justify-start">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-green-600" />
              <span className="hidden sm:inline">Enterprise Security</span>
              <span className="sm:hidden">Security</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-600" />
              <span className="hidden sm:inline">24/7 Support</span>
              <span className="sm:hidden">Support</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-purple-600" />
              <span className="hidden sm:inline">Global Access</span>
              <span className="sm:hidden">Global</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-red-600" />
              <span className="hidden sm:inline">Anti-Cheating</span>
              <span className="sm:hidden">Anti-Cheat</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 px-4">
              Everything You Need for Modern Exam Management
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Our platform provides comprehensive tools and features to streamline your examination process
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <GraduationCap className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Exam Management</CardTitle>
                <CardDescription>
                  Create, schedule, and manage comprehensive examinations with ease
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Question bank management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Automated scheduling
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Real-time monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Role-Based Access</CardTitle>
                <CardDescription>
                  Secure access control for admins, teachers, and students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Multi-tenant architecture
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Granular permissions
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    User management
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <Shield className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Anti-Cheating</CardTitle>
                <CardDescription>
                  Advanced security features to maintain exam integrity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Browser lockdown
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Proctoring integration
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Activity monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* College Selection Section */}
      <section id="college-selection" className="bg-gray-50 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 px-4">
                Ready to Get Started?
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 px-4">
                Select your institution or register a new one to begin
              </p>
            </div>

            <Card className="shadow-xl border-0">
              <CardHeader className="text-center px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl">Select Your Institution</CardTitle>
                <CardDescription className="text-base sm:text-lg">
                  Enter your college username to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="collegeUsername" className="text-sm sm:text-base font-medium">College Username</Label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                    <Input
                      id="collegeUsername"
                      type="text"
                      placeholder="Enter college username"
                      value={collegeUsername}
                      onChange={(e) => setCollegeUsername(e.target.value)}
                      disabled={isValidatingCollege}
                      className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                    />
                    <Button
                      type="button"
                      onClick={validateCollege}
                      disabled={!collegeUsername.trim() || isValidatingCollege}
                      variant="outline"
                      className="h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base"
                    >
                      {isValidatingCollege ? 'Validating...' : 'Validate'}
                    </Button>
                  </div>
                </div>

                {college && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 font-medium text-sm sm:text-base">
                      ✓ {college.name} - Ready to proceed
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={handleContinue}
                    disabled={!college}
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700"
                  >
                    Continue to Login
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <div className="text-center text-gray-500 text-xs sm:text-sm">or</div>
                  
                  <Button
                    onClick={handleCollegeRegistration}
                    variant="outline"
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Register New Institution
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                <span className="text-lg sm:text-xl font-bold">ExamSaaS</span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                Secure, scalable exam management for educational institutions worldwide.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
            <p>&copy; 2025 ExamSaaS. All rights reserved. | Platform version: 1.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
