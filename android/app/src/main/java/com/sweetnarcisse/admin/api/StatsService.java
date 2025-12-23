package com.sweetnarcisse.admin.api;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;

/**
 * Service API pour les statistiques et l'historique
 */
public class StatsService {
    
    private final OkHttpClient client;
    private final String baseUrl;
    
    public StatsService() {
        this.client = ApiClient.getInstance();
        this.baseUrl = "https://sweet-narcisse.fr";
    }
    
    /**
     * Récupérer les stats d'aujourd'hui
     * 
     * GET /api/mobile/stats/today
     */
    public void getTodayStats(Callback callback) {
        String url = baseUrl + "/api/mobile/stats/today";
        
        Request request = new Request.Builder()
            .url(url)
            .get()
            .build();
        
        client.newCall(request).enqueue(callback);
    }
    
    /**
     * Récupérer l'historique des réservations
     * 
     * GET /api/mobile/history?limit=50&offset=0
     */
    public void getHistory(int limit, int offset, Callback callback) {
        String url = baseUrl + "/api/mobile/history?limit=" + limit + "&offset=" + offset;
        
        Request request = new Request.Builder()
            .url(url)
            .get()
            .build();
        
        client.newCall(request).enqueue(callback);
    }
}
