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
 * Service API pour les paiements Tap to Pay via Stripe Terminal
 * 
 * Endpoints utilisés:
 * - POST /api/payments/terminal/token → Connection token
 * - POST /api/payments/terminal/session → Créer une session de paiement
 * - GET  /api/payments/terminal/session/next?deviceId=xxx → Claim next session
 * - PATCH /api/payments/terminal/session/{id} → Update session status
 */
public class PaymentService {
    
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private final OkHttpClient client;
    private final String baseUrl;
    
    public PaymentService() {
        this.client = ApiClient.getInstance();
        this.baseUrl = ApiClient.getBaseUrl();
    }
    
    /**
     * Obtenir un token de connexion Stripe Terminal
     * 
     * POST /api/payments/terminal/token
     * Response: { secret: string, locationId: string | null }
     */
    public void getConnectionToken(String deviceId, Callback callback) {
        try {
            JSONObject json = new JSONObject();
            if (deviceId != null) {
                json.put("deviceId", deviceId);
            }
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            String url = baseUrl + "/api/payments/terminal/token";
            
            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();
            
            client.newCall(request).enqueue(callback);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to build token request", e);
        }
    }
    
    /**
     * Créer une nouvelle session de paiement (depuis le web vers le mobile)
     * 
     * POST /api/payments/terminal/session
     * Body: { bookingId: string, amountCents?: number, targetDeviceId?: string }
     * Response: { session: PaymentSession }
     */
    public void createPaymentSession(String bookingId, int amountCents, String targetDeviceId, Callback callback) {
        try {
            JSONObject json = new JSONObject();
            json.put("bookingId", bookingId);
            if (amountCents > 0) {
                json.put("amountCents", amountCents);
            }
            if (targetDeviceId != null) {
                json.put("targetDeviceId", targetDeviceId);
            }
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            String url = baseUrl + "/api/payments/terminal/session";
            
            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();
            
            client.newCall(request).enqueue(callback);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to build create session request", e);
        }
    }
    
    /**
     * Poll pour claim la prochaine session de paiement en attente
     * 
     * GET /api/payments/terminal/session/next?deviceId=xxx
     * 
     * Responses:
     * - 200: Session claimed avec PaymentIntent { session, booking, paymentIntent }
     * - 204: No session pending
     * - 403: Forbidden
     */
    public void claimNextSession(String deviceId, Callback callback) {
        String url = baseUrl + "/api/payments/terminal/session/next?deviceId=" + deviceId;
        
        Request request = new Request.Builder()
            .url(url)
            .get()
            .build();
        
        client.newCall(request).enqueue(callback);
    }
    
    /**
     * Mettre à jour le status d'une PaymentSession
     * 
     * PATCH /api/payments/terminal/session/{id}
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
            String url = baseUrl + "/api/payments/terminal/session/" + sessionId;
            
            Request request = new Request.Builder()
                .url(url)
                .patch(body)
                .build();
            
            client.newCall(request).enqueue(callback);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to build update request", e);
        }
    }
    
    /**
     * Confirmer un paiement réussi
     * 
     * POST /api/payments/terminal/session/{id}/confirm
     * Body: { paymentIntentId: string }
     */
    public void confirmPayment(String sessionId, String paymentIntentId, Callback callback) {
        try {
            JSONObject json = new JSONObject();
            json.put("paymentIntentId", paymentIntentId);
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            String url = baseUrl + "/api/payments/terminal/session/" + sessionId + "/confirm";
            
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
