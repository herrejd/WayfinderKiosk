/**
 * TypeScript interfaces for the Airport Wayfinder Kiosk application
 */

/**
 * Geographic position with floor information
 */
export interface Position {
  lat: number;
  lng: number;
  floor: string;
}

/**
 * Point of Interest (POI) in the airport
 */
export interface POI {
  id: string;
  name: string;
  category: 'shop' | 'eat' | 'relax';
  description: string;
  position: Position;
  floor: string;
  distanceMeters?: number;
  imageUrl?: string;
  phone?: string;
  website?: string;
  hours?: string;
  amenities?: string[];
}

/**
 * Waypoint along a route
 */
export interface Waypoint {
  position: Position;
  instruction: string;
  distanceMeters: number;
}

/**
 * Route from one location to another
 */
export interface Route {
  id: string;
  startPosition: Position;
  endPosition: Position;
  waypoints: Waypoint[];
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  instructions: string[];
}

/**
 * Boarding pass data extracted from PDF417 barcode
 */
export interface BoardingPassData {
  flightNumber: string;
  airline: string;
  gate?: string;
  departureTime: string;
  passengerName: string;
  seatNumber?: string;
  boardingGroup?: string;
  boardingTime?: string;
  barcode?: string;
  confirmationCode?: string;
}

/**
 * Flight information for gate finder
 */
export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  destination: string;
  departureTime: string;
  gate?: string;
  status: 'scheduled' | 'boarding' | 'boarding-complete' | 'departed' | 'delayed' | 'cancelled';
  terminal?: string;
  aircraft?: string;
}

/**
 * Gate information
 */
export interface Gate {
  id: string;
  gateNumber: string;
  position: Position;
  floor: string;
  currentFlight?: Flight;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  language: 'en' | 'es' | 'fr';
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
  };
  audioEnabled: boolean;
}

/**
 * Error tracking and logging
 */
export interface KioskError {
  id: string;
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  context?: Record<string, unknown>;
  stack?: string;
}
