// Centralized business constants
export const PRICES = {
  ADULT: 9,
  CHILD: 4,
  BABY: 0,
};

export const GROUP_THRESHOLD = 12; // >12 triggers group flow
export const TOUR_DURATION_MINUTES = 25;
export const TOUR_BUFFER_MINUTES = 5;
export const MIN_BOOKING_DELAY_MINUTES = 30;
// Base grid interval in minutes along the day; keep small so offsets can be matched precisely
export const DEPARTURE_INTERVAL_MINUTES = 5;

// Per-boat departure offsets within a 30-minute cycle so that:
// - Boat 1 departs at :00, arrives at :25, and can depart again at :30 (after 5 min buffer)
// - Boat 4 departs at :25, exactly when Boat 1 arrives
// Adjust length based on actual fleet size (use first N offsets)
export const BOAT_DEPARTURE_OFFSETS_MINUTES: number[] = [0, 5, 10, 25];

// Default capacities (fallback) – actual boat capacity from DB overrides
export const DEFAULT_BOAT_CAPACITY = 12;
