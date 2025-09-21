'use client';

import { useEffect, useState } from 'react';
import { useUserStore, UserLocation } from '@/store/userStore';

interface LocationDetectorProps {
  onLocationDetected: (location: UserLocation) => void;
}

// Major universities with their coordinates (within ~5 miles detection)
const UNIVERSITIES = [
  { name: 'University of Wisconsin-Milwaukee', lat: 43.0766, lng: -87.8823 },
  { name: 'Marquette University', lat: 43.0389, lng: -87.9275 },
  { name: 'University of Wisconsin-Madison', lat: 43.0766, lng: -89.4125 },
  { name: 'Georgia Tech', lat: 33.7756, lng: -84.3963 },
  { name: 'MIT', lat: 42.3601, lng: -71.0942 },
  { name: 'Stanford University', lat: 37.4275, lng: -122.1697 },
  { name: 'UC Berkeley', lat: 37.8719, lng: -122.2585 },
  { name: 'University of Chicago', lat: 41.7886, lng: -87.5987 },
  { name: 'Northwestern University', lat: 42.0565, lng: -87.6753 },
  { name: 'University of Michigan', lat: 42.2808, lng: -83.7382 },
];

// Calculate distance between two coordinates in miles
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check if location is near any university (within 5 miles)
function isNearUniversity(lat: number, lng: number): boolean {
  return UNIVERSITIES.some(uni => 
    calculateDistance(lat, lng, uni.lat, uni.lng) <= 5
  );
}

// Mock IP-based location lookup (in production, use a real service like ipinfo.io)
async function getLocationFromIP(): Promise<{ lat: number; lng: number; city: string; state: string; country: string }> {
  // Mock data for demonstration - in production, call ipinfo.io or similar
  const mockLocations = [
    { lat: 43.0766, lng: -87.8823, city: 'Milwaukee', state: 'Wisconsin', country: 'US' },
    { lat: 43.0389, lng: -87.9275, city: 'Milwaukee', state: 'Wisconsin', country: 'US' },
    { lat: 33.7756, lng: -84.3963, city: 'Atlanta', state: 'Georgia', country: 'US' },
    { lat: 42.3601, lng: -71.0942, city: 'Cambridge', state: 'Massachusetts', country: 'US' },
    { lat: 37.8719, lng: -122.2585, city: 'Berkeley', state: 'California', country: 'US' },
  ];
  
  // Return a random mock location for demo purposes
  const randomLocation = mockLocations[Math.floor(Math.random() * mockLocations.length)];
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return randomLocation;
}

export default function LocationDetector({ onLocationDetected }: LocationDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location, locationDetected } = useUserStore();

  useEffect(() => {
    // Skip detection if we already have location data
    if (location && locationDetected) {
      onLocationDetected(location);
      setIsDetecting(false);
      return;
    }

    const detectLocation = async () => {
      try {
        // Try geolocation API first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // For demo, we'll use mock city data based on coordinates
              // In production, you'd reverse geocode the coordinates
              const mockLocation = await getLocationFromIP();
              
              const userLocation: UserLocation = {
                lat: latitude,
                lng: longitude,
                city: mockLocation.city,
                state: mockLocation.state,
                country: mockLocation.country,
                isNearUniversity: isNearUniversity(latitude, longitude),
              };
              
              onLocationDetected(userLocation);
              setIsDetecting(false);
            },
            async (error) => {
              console.warn('Geolocation failed, falling back to IP:', error);
              
              // Fallback to IP-based location
              const ipLocation = await getLocationFromIP();
              const userLocation: UserLocation = {
                lat: ipLocation.lat,
                lng: ipLocation.lng,
                city: ipLocation.city,
                state: ipLocation.state,
                country: ipLocation.country,
                isNearUniversity: isNearUniversity(ipLocation.lat, ipLocation.lng),
              };
              
              onLocationDetected(userLocation);
              setIsDetecting(false);
            },
            {
              timeout: 10000,
              enableHighAccuracy: false,
            }
          );
        } else {
          // No geolocation support, use IP fallback
          const ipLocation = await getLocationFromIP();
          const userLocation: UserLocation = {
            lat: ipLocation.lat,
            lng: ipLocation.lng,
            city: ipLocation.city,
            state: ipLocation.state,
            country: ipLocation.country,
            isNearUniversity: isNearUniversity(ipLocation.lat, ipLocation.lng),
          };
          
          onLocationDetected(userLocation);
          setIsDetecting(false);
        }
      } catch (err) {
        console.error('Location detection failed:', err);
        setError('Unable to detect your location. Please try again.');
        setIsDetecting(false);
      }
    };

    detectLocation();
  }, [onLocationDetected, location, locationDetected]);

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isDetecting) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-300">Detecting your location...</p>
      </div>
    );
  }

  return null;
}
