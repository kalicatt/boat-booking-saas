package com.sweetnarcisse.admin.api;

import android.util.Log;

import com.sweetnarcisse.admin.models.LoginRequest;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Service d'authentification via NextAuth
 */
public class AuthService {
    
    private static final String TAG = "AuthService";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final String baseUrl;
    
    public AuthService(OkHttpClient client) {
        this.client = client;
        this.baseUrl = ApiClient.getBaseUrl();
    }
    
    /**
     * Connexion avec email + password via NextAuth credentials provider
     */
    public void login(String email, String password, Callback callback) {
        try {
            // Construire le body JSON
            JSONObject json = new JSONObject();
            json.put("email", email);
            json.put("password", password);
            json.put("csrfToken", ""); // NextAuth peut nécessiter un CSRF token
            json.put("callbackUrl", baseUrl + "/admin");
            json.put("json", true);
            
            RequestBody body = RequestBody.create(json.toString(), JSON);
            
            // Endpoint NextAuth credentials
            String url = baseUrl + "/api/auth/callback/credentials";
            
            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();
            
            Log.d(TAG, "Envoi requête de login vers: " + url);
            
            client.newCall(request).enqueue(callback);
            
        } catch (JSONException e) {
            Log.e(TAG, "Erreur lors de la création du JSON de login", e);
        }
    }
    
    /**
     * Déconnexion
     */
    public void logout(Callback callback) {
        String url = baseUrl + "/api/auth/signout";
        
        Request request = new Request.Builder()
            .url(url)
            .post(RequestBody.create("", JSON))
            .build();
        
        client.newCall(request).enqueue(callback);
    }
    
    /**
     * Récupérer les informations de session
     */
    public void getSession(Callback callback) {
        String url = baseUrl + "/api/auth/session";
        
        Request request = new Request.Builder()
            .url(url)
            .get()
            .build();
        
        client.newCall(request).enqueue(callback);
    }
}
