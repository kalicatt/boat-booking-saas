package com.sweetnarcisse.admin;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Écran de confirmation après un check-in réussi
 * Affiche les détails de la réservation et retourne au scanner après 3 secondes
 */
public class CheckinConfirmationActivity extends AppCompatActivity {
    
    private static final String TAG = "CheckinConfirmation";
    private static final int AUTO_CLOSE_DELAY = 3000; // 3 secondes
    
    private TextView statusText;
    private TextView customerNameText;
    private TextView timeSlotText;
    private TextView boatNameText;
    private TextView participantsText;
    private TextView languageText;
    private MaterialButton doneButton;
    private MaterialButton newScanButton;
    
    private Handler handler = new Handler();
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkin_confirmation);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Check-in confirmé");
            getSupportActionBar().setDisplayHomeAsUpEnabled(false);
        }
        
        // Bind views
        statusText = findViewById(R.id.statusText);
        customerNameText = findViewById(R.id.customerNameText);
        timeSlotText = findViewById(R.id.timeSlotText);
        boatNameText = findViewById(R.id.boatNameText);
        participantsText = findViewById(R.id.participantsText);
        languageText = findViewById(R.id.languageText);
        doneButton = findViewById(R.id.doneButton);
        newScanButton = findViewById(R.id.newScanButton);
        
        // Parse response
        String responseJson = getIntent().getStringExtra("response");
        if (responseJson != null) {
            parseAndDisplayBooking(responseJson);
        }
        
        // Setup buttons
        doneButton.setOnClickListener(v -> returnToDashboard());
        newScanButton.setOnClickListener(v -> returnToScanner());
        
        // Auto-retour au scanner après 3 secondes
        handler.postDelayed(this::returnToScanner, AUTO_CLOSE_DELAY);
    }
    
    private void parseAndDisplayBooking(String json) {
        try {
            JSONObject response = new JSONObject(json);
            
            if (response.has("booking")) {
                JSONObject booking = response.getJSONObject("booking");
                
                String customerName = booking.optString("customerName", "N/A");
                String timeSlot = booking.optString("timeSlot", "N/A");
                String boatName = booking.optString("boatName", "N/A");
                int participants = booking.optInt("participants", 0);
                String language = booking.optString("language", "N/A");
                String checkinStatus = booking.optString("checkinStatus", "");
                
                customerNameText.setText(customerName);
                timeSlotText.setText(formatTimeSlot(timeSlot));
                boatNameText.setText(boatName);
                participantsText.setText(participants + " personnes");
                languageText.setText(getLanguageLabel(language));
                
                // Status badge
                if ("EMBARQUED".equals(checkinStatus)) {
                    statusText.setText("✅ EMBARQUÉ");
                    statusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark, null));
                }
            }
            
        } catch (JSONException e) {
            Log.e(TAG, "Erreur lors du parsing JSON", e);
        }
    }
    
    private String formatTimeSlot(String timeSlot) {
        // timeSlot format: "2024-01-20T14:00:00.000Z"
        // À améliorer avec SimpleDateFormat
        if (timeSlot.contains("T")) {
            String[] parts = timeSlot.split("T");
            String date = parts[0];
            String time = parts[1].substring(0, 5);
            return date + " à " + time;
        }
        return timeSlot;
    }
    
    private String getLanguageLabel(String code) {
        switch (code) {
            case "fr": return "🇫🇷 Français";
            case "en": return "🇬🇧 English";
            case "es": return "🇪🇸 Español";
            case "de": return "🇩🇪 Deutsch";
            case "it": return "🇮🇹 Italiano";
            default: return code;
        }
    }
    
    private void returnToDashboard() {
        handler.removeCallbacksAndMessages(null);
        Intent intent = new Intent(this, DashboardActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
    
    private void returnToScanner() {
        handler.removeCallbacksAndMessages(null);
        Intent intent = new Intent(this, ScannerActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
    }
}
