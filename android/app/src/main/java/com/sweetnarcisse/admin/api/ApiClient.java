package com.sweetnarcisse.admin.api;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;

/**
 * Client API centralisé pour toutes les requêtes HTTP
 */
public class ApiClient {
    
    private static final String TAG = "ApiClient";
    
    // URL de base de l'API
    private static final String BASE_URL = "https://sweet-narcisse.fr";
    
    // Singleton
    private static OkHttpClient client;
    private static Context appContext;
    
    /**
     * Initialiser avec le contexte Application (appeler dans SweetNarcisseApp.onCreate)
     */
    public static void init(Context context) {
        appContext = context.getApplicationContext();
    }
    
    /**
     * Obtenir l'instance singleton du client OkHttp
     */
    public static OkHttpClient getInstance() {
        if (client == null) {
            if (appContext == null) {
                throw new IllegalStateException("ApiClient not initialized. Call init() in Application.onCreate()");
            }
            client = buildClient(appContext);
        }
        return client;
    }
    
    public static OkHttpClient getClient(Context context) {
        if (appContext == null) {
            appContext = context.getApplicationContext();
        }
        return getInstance();
    }
    
    private static OkHttpClient buildClient(Context context) {
        // Logging interceptor pour debug
        HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
        loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
        
        // Cookie interceptor pour NextAuth session
        CookieInterceptor cookieInterceptor = new CookieInterceptor(context);
        
        return new OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(cookieInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
    }
    
    public static String getBaseUrl() {
        return BASE_URL;
    }
    
    /**
     * Interceptor pour ajouter le token JWT Bearer et gérer les cookies
     */
    static class CookieInterceptor implements Interceptor {
        
        private static final String PREFS_NAME = "SweetNarcissePrefs";
        private static final String KEY_SESSION_COOKIE = "session_cookie";
        private static final String KEY_AUTH_TOKEN = "auth_token";
        
        private final Context context;
        
        CookieInterceptor(Context context) {
            this.context = context;
        }
        
        @Override
        public Response intercept(Chain chain) throws IOException {
            Request original = chain.request();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            Request.Builder requestBuilder = original.newBuilder();
            
            // 1. Ajouter le token JWT Bearer si disponible (prioritaire pour les API mobiles)
            String authToken = prefs.getString(KEY_AUTH_TOKEN, null);
            if (authToken != null && !authToken.isEmpty()) {
                requestBuilder.header("Authorization", "Bearer " + authToken);
                Log.d(TAG, "Token Bearer ajouté à la requête");
            }
            
            // 2. Ajouter le cookie de session si disponible (pour compatibilité web)
            String sessionCookie = prefs.getString(KEY_SESSION_COOKIE, null);
            if (sessionCookie != null && !sessionCookie.isEmpty()) {
                requestBuilder.header("Cookie", sessionCookie);
            }
            
            // 3. Toujours ajouter User-Agent et Accept
            requestBuilder.header("User-Agent", "SweetNarcisse-Android/2.0");
            requestBuilder.header("Accept", "application/json");
            
            Request request = requestBuilder.build();
            Response response = chain.proceed(request);
            
            // Sauvegarder le cookie de réponse si présent
            String setCookie = response.header("Set-Cookie");
            if (setCookie != null && !setCookie.isEmpty()) {
                // Extraire le cookie de session NextAuth
                if (setCookie.contains("next-auth.session-token") || 
                    setCookie.contains("__Secure-next-auth.session-token")) {
                    prefs.edit().putString(KEY_SESSION_COOKIE, setCookie).apply();
                    Log.d(TAG, "Cookie de session sauvegardé");
                }
            }
            
            return response;
        }
    }
}
