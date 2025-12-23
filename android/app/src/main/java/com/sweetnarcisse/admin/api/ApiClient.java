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
    
    public static OkHttpClient getClient(Context context) {
        if (client == null) {
            client = buildClient(context);
        }
        return client;
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
     * Interceptor pour gérer les cookies de session NextAuth
     */
    static class CookieInterceptor implements Interceptor {
        
        private static final String PREFS_NAME = "SweetNarcissePrefs";
        private static final String KEY_SESSION_COOKIE = "session_cookie";
        
        private final Context context;
        
        CookieInterceptor(Context context) {
            this.context = context;
        }
        
        @Override
        public Response intercept(Chain chain) throws IOException {
            Request original = chain.request();
            
            // Ajouter le cookie de session si disponible
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String sessionCookie = prefs.getString(KEY_SESSION_COOKIE, null);
            
            Request.Builder requestBuilder = original.newBuilder();
            
            if (sessionCookie != null && !sessionCookie.isEmpty()) {
                requestBuilder.header("Cookie", sessionCookie);
                Log.d(TAG, "Cookie ajouté à la requête");
            }
            
            // Toujours ajouter User-Agent
            requestBuilder.header("User-Agent", "SweetNarcisse-Android/2.0");
            
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
