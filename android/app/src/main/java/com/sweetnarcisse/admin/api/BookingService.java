package com.sweetnarcisse.admin.api;

import android.util.Log;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Service pour vérifier et check-in les réservations via QR code
 */
public class BookingService {
    
    private static final String TAG = "BookingService";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final String baseUrl;
    
    public BookingService(OkHttpClient client) {
        this.client = client;
        this.baseUrl = ApiClient.getBaseUrl();
    }
    
    /**
     * Vérifier un booking via QR code et effectuer le check-in automatique
     * 
     * @param bookingId ID de la réservation
     * @param token Token JWT du QR code
     * @param autoCheckin true pour check-in automatique (par défaut)
     * @param callback Callback avec la réponse
     */
    public void verifyAndCheckin(String bookingId, String token, boolean autoCheckin, Callback callback) {
        try {
            // Construire le body JSON
            JSONObject json = new JSONObject();
            json.put("bookingId", bookingId);
            json.put("token", token);
            json.put("autoCheckin", autoCheckin);
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            
            // Notre nouvelle API
            String url = baseUrl + "/api/mobile/bookings/verify";
            
            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();
            
            Log.d(TAG, "Vérification booking: " + bookingId);
            
            client.newCall(request).enqueue(callback);
            
        } catch (JSONException e) {
            Log.e(TAG, "Erreur lors de la création du JSON de vérification", e);
        }
    }
    
    /**
     * Raccourci : vérifier avec check-in automatique activé
     */
    public void verifyAndCheckin(String bookingId, String token, Callback callback) {
        verifyAndCheckin(bookingId, token, true, callback);
    }
}
