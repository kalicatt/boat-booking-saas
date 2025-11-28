## TripReviews Carousel Enhancement
- [x] Remove horizontal scrollbar from carousel viewport
- [x] Implement circular 3D rotation effect for review cards (center highlight, looping)
- [x] Ensure navigation arrows remain functional without scrollbar

## Google Reviews Integration
- [x] Create `/api/reviews/google` to proxy Google Places reviews
- [x] Extend review types to support Google responses
- [x] Update `TripReviews` to merge Google reviews (with attribution + fallback)

## TripAdvisor Reversion
- [x] Remove Google reviews fetch and restore TripAdvisor-only carousel
- [x] Delete Google reviews API route and env documentation
- [x] Clean up translations and types related to Google strings
