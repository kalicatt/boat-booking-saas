/**
 * Services Layer - Sweet Narcisse
 * 
 * This module exports all business services.
 * Services contain business logic extracted from API routes,
 * making the codebase more testable and maintainable.
 * 
 * API routes should be "thin controllers" that:
 * 1. Parse and validate input
 * 2. Call service methods
 * 3. Format and return response
 */

export { BookingService } from './BookingService'
export { PaymentService } from './PaymentService'
export { FleetService } from './FleetService'

// Re-export types for convenience
export type { 
  CreateBookingInput, 
  BookingResult, 
  ConflictCheckResult,
  SlotValidationResult 
} from './BookingService'

export type { 
  ProcessPaymentInput, 
  PaymentResult,
  RefundInput,
  RefundResult 
} from './PaymentService'

export type { 
  BoatRotationResult, 
  FleetCapacityResult 
} from './FleetService'
