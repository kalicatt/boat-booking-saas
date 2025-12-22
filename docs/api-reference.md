# Sweet Narcisse - API Reference

Complete API documentation for the Sweet Narcisse booking system.

## Base URL

```
Production: https://sweet-narcisse.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via NextAuth.js session cookies.

### Admin Endpoints
Require `role: ADMIN` in session.

### Public Endpoints
No authentication required.

---

## 📅 Availability

### GET /api/availability

Get availability for a date range.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string | Yes | Month in format `YYYY-MM` |
| `boat` | string | No | Filter by boat (default: all) |

**Response:**

```json
{
  "2025-01-15": {
    "morning": { "available": true, "spots": 12 },
    "afternoon": { "available": true, "spots": 12 },
    "sunset": { "available": false, "spots": 0 }
  },
  "2025-01-16": {
    "morning": { "available": true, "spots": 8 },
    ...
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid month format
- `500` - Server error

---

## 🎫 Bookings

### POST /api/bookings

Create a new booking.

**Request Body:**

```json
{
  "date": "2025-01-15",
  "tripType": "morning",
  "adults": 2,
  "children": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+33612345678",
  "language": "en",
  "paymentMethod": "stripe",
  "specialRequests": "Vegetarian meal please",
  "captchaToken": "recaptcha_token_here"
}
```

**Response:**

```json
{
  "success": true,
  "bookingId": "abc123",
  "reference": "SN-2025-001234",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 15000
}
```

**Trip Types:**
- `morning` - 09:00-12:00
- `afternoon` - 14:00-17:00
- `sunset` - 18:00-21:00 (summer only)
- `fullday` - 09:00-17:00

**Status Codes:**
- `201` - Booking created
- `400` - Validation error
- `409` - No availability
- `429` - Rate limited
- `500` - Server error

---

### GET /api/bookings/[id]

Get booking details.

**Authentication:** Required (session or token)

**Response:**

```json
{
  "id": "abc123",
  "reference": "SN-2025-001234",
  "status": "CONFIRMED",
  "date": "2025-01-15",
  "tripType": "morning",
  "adults": 2,
  "children": 1,
  "totalPrice": 150,
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "createdAt": "2025-01-10T10:30:00Z"
}
```

---

### DELETE /api/bookings/[id]

Cancel a booking.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | No | Cancellation reason |

**Response:**

```json
{
  "success": true,
  "refundAmount": 150,
  "refundStatus": "pending"
}
```

---

## 💳 Payments

### POST /api/stripe/webhook

Stripe webhook endpoint.

**Headers:**
- `stripe-signature` - Webhook signature

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

### POST /api/paypal/create-order

Create PayPal order.

**Request Body:**

```json
{
  "bookingId": "abc123"
}
```

**Response:**

```json
{
  "orderId": "PAYPAL_ORDER_ID"
}
```

---

### POST /api/paypal/capture-order

Capture PayPal payment.

**Request Body:**

```json
{
  "orderId": "PAYPAL_ORDER_ID",
  "bookingId": "abc123"
}
```

---

## 📧 Contact

### POST /api/contact

Send contact form message.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question about tours",
  "message": "Hello, I have a question...",
  "captchaToken": "recaptcha_token"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "msg_123"
}
```

---

## 👤 Admin Endpoints

### GET /api/admin/bookings

List all bookings (admin only).

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | all | Filter by status |
| `from` | string | - | Start date |
| `to` | string | - | End date |

---

### GET /api/admin/stats

Get dashboard statistics.

**Response:**

```json
{
  "today": {
    "bookings": 5,
    "revenue": 750,
    "passengers": 15
  },
  "month": {
    "bookings": 45,
    "revenue": 6750,
    "passengers": 135
  },
  "occupancy": {
    "morning": 0.75,
    "afternoon": 0.60,
    "sunset": 0.85
  }
}
```

---

### PATCH /api/admin/bookings/[id]

Update booking (admin only).

**Request Body:**

```json
{
  "status": "CONFIRMED",
  "notes": "Admin note here"
}
```

---

## 🔧 System Endpoints

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.2.3",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

---

### GET /api/metrics

Prometheus metrics (internal).

**Response:**
```
# HELP sweet_narcisse_booking_count_total Total bookings
# TYPE sweet_narcisse_booking_count_total counter
sweet_narcisse_booking_count_total{language="en"} 150
sweet_narcisse_booking_count_total{language="fr"} 230
...
```

---

### GET /api/cron/[task]

Cron job endpoints (requires CRON_SECRET).

**Tasks:**
- `send-reminders` - Send booking reminders
- `send-reviews` - Send review requests
- `cleanup` - Clean expired data
- `backup` - Trigger backup

---

## 📦 Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid"
    }
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., no availability) |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## 🔒 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/bookings` POST | 5 | 15 min |
| `/api/contact` POST | 3 | 15 min |
| `/api/availability` GET | 60 | 1 min |
| Admin endpoints | 100 | 1 min |

Rate limit headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## 📝 Changelog

### v1.3.0 (Current)
- Added PayPal support
- Blue-green deployment
- Cost monitoring metrics

### v1.2.0
- Multi-language support
- Sunset tours
- Review system

### v1.1.0
- Stripe integration
- Email confirmations
- Admin dashboard
