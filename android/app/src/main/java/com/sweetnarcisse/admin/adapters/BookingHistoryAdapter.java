package com.sweetnarcisse.admin.adapters;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.sweetnarcisse.admin.R;
import com.sweetnarcisse.admin.models.BookingHistory;

import java.util.List;
import java.util.Locale;

/**
 * Adaptateur pour afficher les réservations dans l'historique
 */
public class BookingHistoryAdapter extends RecyclerView.Adapter<BookingHistoryAdapter.BookingViewHolder> {
    
    private final List<BookingHistory> bookings;
    
    public BookingHistoryAdapter(List<BookingHistory> bookings) {
        this.bookings = bookings;
    }
    
    @NonNull
    @Override
    public BookingViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_booking_history, parent, false);
        return new BookingViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull BookingViewHolder holder, int position) {
        BookingHistory booking = bookings.get(position);
        
        // Référence
        holder.referenceText.setText(booking.reference);
        
        // Status badge
        holder.statusBadge.setText(getStatusLabel(booking.checkinStatus));
        holder.statusBadge.setBackgroundColor(getStatusColor(booking.checkinStatus));
        
        // Client
        holder.customerText.setText(booking.customerName + " - " + booking.customerEmail);
        
        // Bateau + Créneau
        holder.boatSlotText.setText(booking.boat + " • " + booking.slot);
        
        // Date + Heure embarquement
        String dateTime = "📅 " + booking.date;
        if (booking.checkinAt != null) {
            dateTime += " " + booking.checkinAt;
        }
        holder.dateTimeText.setText(dateTime);
        
        // Paiement
        String paymentText = "";
        if ("PAID".equals(booking.paymentStatus)) {
            String icon = "card".equals(booking.paymentMethod) ? "💳" : "💰";
            paymentText = icon + " " + String.format(Locale.FRENCH, "%.2f €", booking.totalPrice);
        } else if ("PENDING".equals(booking.paymentStatus)) {
            paymentText = "⏳ " + String.format(Locale.FRENCH, "%.2f €", booking.totalPrice);
        } else {
            paymentText = String.format(Locale.FRENCH, "%.2f €", booking.totalPrice);
        }
        holder.paymentText.setText(paymentText);
    }
    
    @Override
    public int getItemCount() {
        return bookings.size();
    }
    
    private String getStatusLabel(String status) {
        switch (status) {
            case "EMBARQUED": return "EMBARQUÉ";
            case "CONFIRMED": return "CONFIRMÉ";
            case "COMPLETED": return "TERMINÉ";
            case "CANCELLED": return "ANNULÉ";
            default: return status;
        }
    }
    
    private int getStatusColor(String status) {
        switch (status) {
            case "EMBARQUED": return Color.parseColor("#4CAF50"); // Green
            case "CONFIRMED": return Color.parseColor("#2196F3"); // Blue
            case "COMPLETED": return Color.parseColor("#9E9E9E"); // Grey
            case "CANCELLED": return Color.parseColor("#F44336"); // Red
            default: return Color.parseColor("#FF9800"); // Orange
        }
    }
    
    static class BookingViewHolder extends RecyclerView.ViewHolder {
        TextView referenceText;
        TextView statusBadge;
        TextView customerText;
        TextView boatSlotText;
        TextView dateTimeText;
        TextView paymentText;
        
        public BookingViewHolder(@NonNull View itemView) {
            super(itemView);
            referenceText = itemView.findViewById(R.id.referenceText);
            statusBadge = itemView.findViewById(R.id.statusBadge);
            customerText = itemView.findViewById(R.id.customerText);
            boatSlotText = itemView.findViewById(R.id.boatSlotText);
            dateTimeText = itemView.findViewById(R.id.dateTimeText);
            paymentText = itemView.findViewById(R.id.paymentText);
        }
    }
}
