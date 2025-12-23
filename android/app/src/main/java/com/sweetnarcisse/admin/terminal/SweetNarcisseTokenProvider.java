package com.sweetnarcisse.admin.terminal;

import android.util.Log;

import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback;
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider;
import com.stripe.stripeterminal.external.models.ConnectionTokenException;
import com.sweetnarcisse.admin.api.ApiClient;

import org.json.JSONObject;

import java.io.IOException;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Fournit les tokens de connexion Stripe Terminal depuis le backend
 * 
 * Endpoint: POST /api/payments/terminal/token
 * Response: { secret: string, locationId: string | null }
 */
public class SweetNarcisseTokenProvider implements ConnectionTokenProvider {
    
    private static final String TAG = "TerminalTokenProvider";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final String baseUrl;
    private String deviceId;
    
    public SweetNarcisseTokenProvider() {
        this.client = ApiClient.getInstance();
        this.baseUrl = ApiClient.getBaseUrl();
    }
    
    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }
    
    @Override
    public void fetchConnectionToken(ConnectionTokenCallback callback) {
        Log.d(TAG, "Fetching connection token from " + baseUrl + "/api/payments/terminal/token");
        
        new Thread(() -> {
            try {
                JSONObject body = new JSONObject();
                if (deviceId != null) {
                    body.put("deviceId", deviceId);
                }
                
                Log.d(TAG, "Request body: " + body.toString());
                
                RequestBody requestBody = RequestBody.create(body.toString(), JSON);
                
                Request request = new Request.Builder()
                    .url(baseUrl + "/api/payments/terminal/token")
                    .post(requestBody)
                    .build();
                
                Log.d(TAG, "Sending request...");
                Response response = client.newCall(request).execute();
                Log.d(TAG, "Response code: " + response.code());
                
                if (response.isSuccessful() && response.body() != null) {
                    String responseBody = response.body().string();
                    Log.d(TAG, "Response body: " + responseBody);
                    JSONObject json = new JSONObject(responseBody);
                    String secret = json.getString("secret");
                    
                    Log.d(TAG, "Connection token received successfully (length=" + secret.length() + ")");
                    callback.onSuccess(secret);
                } else {
                    String errorBody = "";
                    if (response.body() != null) {
                        errorBody = response.body().string();
                    }
                    String error = "Failed to fetch token: HTTP " + response.code() + " - " + errorBody;
                    Log.e(TAG, error);
                    callback.onFailure(new ConnectionTokenException(error));
                }
            } catch (IOException e) {
                Log.e(TAG, "Network error fetching token", e);
                callback.onFailure(new ConnectionTokenException("Network error: " + e.getMessage(), e));
            } catch (Exception e) {
                Log.e(TAG, "Error fetching token", e);
                callback.onFailure(new ConnectionTokenException("Error: " + e.getMessage(), e));
            }
        }).start();
    }
}
