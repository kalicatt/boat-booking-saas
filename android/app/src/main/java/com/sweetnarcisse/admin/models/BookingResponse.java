package com.sweetnarcisse.admin.models;

/**
 * Réponse de vérification de réservation
 */
public class BookingResponse {
    public boolean success;
    public String message;
    public Booking booking;
    
    public static class Booking {
        public String id;
        public String customerName;
        public String customerEmail;
        public String timeSlot;
        public String boatName;
        public String language;
        public int participants;
        public String checkinStatus;
        public String paymentStatus;
        public String createdAt;
    }
}
