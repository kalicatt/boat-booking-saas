package com.sweetnarcisse.admin.api;

import com.sweetnarcisse.admin.api.ApiClient;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.MediaType;

import org.json.JSONObject;

/**
 * Service API pour les paiements Tap to Pay
 */
public class PaymentService {
    
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private final OkHttpClient client;
    private final String baseUrl;
    
    public PaymentService() {
        this.client = ApiClient.getInstance();
        this.baseUrl = "https://sweet-narcisse.fr";
    }
    
    /**
     * Poll pour claim la prochaine session de paiement en attente
     * 
     * GET /api/mobile/payments/sessions/claim?deviceId=xxx
     * 
     * Responses:
     * - 200: Session available
     * - 204: No session pending
     * - 403: Forbidden
     */
    public void claimNextSession(String deviceId, Callback callback) {
        String url = baseUrl + "/api/mobile/payments/sessions/claim?deviceId=" + deviceId;
        
        Request request = new Request.Builder()
            .url(url)
            .get()
            .build();
        
        client.newCall(request).enqueue(callback);
    }
    
    /**
     * Mettre à jour le status d'une PaymentSession
     * 
     * PATCH /api/mobile/payments/sessions/{id}
     * Body: { status: "PROCESSING" | "SUCCEEDED" | "FAILED", error?: string }
     */
    public void updateSessionStatus(String sessionId, String status, String error, Callback callback) {
        try {
            JSONObject json = new JSONObject();
            json.put("status", status);
            if (error != null) {
                json.put("error", error);
            }
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            String url = baseUrl + "/api/mobile/payments/sessions/" + sessionId;
            
            Request request = new Request.Builder()
                .url(url)
                .patch(body)
                .build();
            
            client.newCall(request).enqueue(callback);
            
        } catch (Exception e) {
            // Fallback error
            throw new RuntimeException("Failed to build update request", e);
        }
    }
    
    /**
     * Créer un Payment Intent Stripe
     * 
     * POST /api/mobile/payments/create-intent
     * Body: { sessionId: string, bookingId: string, amountCents: number }
     */
    public void createPaymentIntent(String sessionId, String bookingId, int amountCents, Callback callback) {
        try {
            JSONObject json = new JSONObject();
            json.put("sessionId", sessionId);
            json.put("bookingId", bookingId);
            json.put("amountCents", amountCents);
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            String url = baseUrl + "/api/mobile/payments/create-intent";
            
            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();
            
            client.newCall(request).enqueue(callback);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to build create intent request", e);
        }
    }
    
    /**
     * Confirmer un paiement réussi
     * 
     * POST /api/mobile/payments/confirm
     * Body: { sessionId: string, paymentIntentId: string }
     */
    public void confirmPayment(String sessionId, String paymentIntentId, Callback callback) {
        try {
            JSONObject json = new JSONObject();
            json.put("sessionId", sessionId);
            json.put("paymentIntentId", paymentIntentId);
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            String url = baseUrl + "/api/mobile/payments/confirm";
            
            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();
            
            client.newCall(request).enqueue(callback);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to build confirm request", e);
        }
    }
}
