// Centralized business constants
export const PRICES = {
  ADULT: 9,
  CHILD: 4,
  BABY: 0,
};

export const GROUP_THRESHOLD = 12; // >12 triggers group flow
export const TOUR_DURATION_MINUTES = 25;
export const TOUR_BUFFER_MINUTES = 5;
export const DEPARTURE_INTERVAL_MINUTES = 10;

// Default capacities (fallback) – actual boat capacity from DB overrides
export const DEFAULT_BOAT_CAPACITY = 12;
