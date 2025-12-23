package com.sweetnarcisse.admin;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.sweetnarcisse.admin.api.PaymentService;

import org.json.JSONObject;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

/**
 * Service foreground qui poll les sessions de paiement
 * Tourne en arrière-plan quand l'app est ouverte
 */
public class PaymentPollingService extends Service {
    
    private static final String TAG = "PaymentPollingService";
    private static final String CHANNEL_ID = "payment_polling";
    private static final int NOTIFICATION_ID = 1001;
    private static final long POLL_INTERVAL_MS = 5000; // 5 secondes
    
    private Handler handler;
    private Runnable pollRunnable;
    private PaymentService paymentService;
    private String deviceId;
    private boolean isRunning = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        Log.d(TAG, "Service créé");
        
        // Générer device ID unique (utilise Android ID)
        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        
        // Initialiser l'API service
        paymentService = new PaymentService();
        
        // Créer le channel de notification
        createNotificationChannel();
        
        // Handler pour le polling
        handler = new Handler(Looper.getMainLooper());
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    pollForSession();
                    handler.postDelayed(this, POLL_INTERVAL_MS);
                }
            }
        };
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service démarré");
        
        // Démarrer en foreground
        Notification notification = buildNotification("En attente de paiements...");
        startForeground(NOTIFICATION_ID, notification);
        
        // Démarrer le polling
        if (!isRunning) {
            isRunning = true;
            handler.post(pollRunnable);
        }
        
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service détruit");
        
        isRunning = false;
        if (handler != null) {
            handler.removeCallbacks(pollRunnable);
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void pollForSession() {
        paymentService.claimNextSession(deviceId, new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.w(TAG, "Poll échec réseau: " + e.getMessage());
                // Continue silencieusement
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.code() == 204) {
                    // Aucune session en attente
                    Log.d(TAG, "Aucune session en attente");
                    return;
                }
                
                if (response.isSuccessful()) {
                    String body = response.body().string();
                    handleSessionClaimed(body);
                } else {
                    Log.w(TAG, "Poll erreur: " + response.code());
                }
            }
        });
    }
    
    private void handleSessionClaimed(String jsonResponse) {
        try {
            JSONObject json = new JSONObject(jsonResponse);
            
            if (!json.has("session")) {
                Log.w(TAG, "Pas de session dans la réponse");
                return;
            }
            
            JSONObject session = json.getJSONObject("session");
            String sessionId = session.getString("id");
            String bookingId = session.optString("bookingId", "");
            int amountCents = session.getInt("amount");
            String currency = session.optString("currency", "EUR");
            
            // Récupérer le clientSecret depuis la session (le backend le met dans session.clientSecret)
            String clientSecret = session.optString("clientSecret", null);
            String locationId = json.optString("locationId", null);
            
            Log.i(TAG, "Session claimed: " + sessionId + ", montant: " + amountCents + " " + currency + ", hasSecret: " + (clientSecret != null));
            
            // Mettre à jour la notification
            updateNotification("Paiement de " + formatAmount(amountCents, currency) + " en attente");
            
            // Broadcast pour ouvrir PaymentActivity
            Intent broadcast = new Intent("com.sweetnarcisse.PAYMENT_SESSION_CLAIMED");
            broadcast.putExtra("sessionId", sessionId);
            broadcast.putExtra("bookingId", bookingId);
            broadcast.putExtra("amountCents", amountCents);
            broadcast.putExtra("currency", currency);
            broadcast.putExtra("mode", "triggered");
            
            // Ajouter clientSecret et locationId si présents
            if (clientSecret != null && !clientSecret.isEmpty()) {
                broadcast.putExtra("clientSecret", clientSecret);
            }
            if (locationId != null && !locationId.isEmpty()) {
                broadcast.putExtra("locationId", locationId);
            }
            
            // Extraire infos booking
            if (json.has("booking")) {
                JSONObject booking = json.getJSONObject("booking");
                String customerName = "";
                if (booking.has("user")) {
                    JSONObject user = booking.getJSONObject("user");
                    String firstName = user.optString("firstName", "");
                    String lastName = user.optString("lastName", "");
                    customerName = (lastName + " " + firstName).trim();
                }
                broadcast.putExtra("customerName", customerName);
                broadcast.putExtra("bookingReference", booking.optString("publicReference", ""));
            } else if (session.has("metadata")) {
                // Fallback sur metadata de session
                JSONObject metadata = session.getJSONObject("metadata");
                broadcast.putExtra("customerName", metadata.optString("customer", ""));
                broadcast.putExtra("bookingReference", metadata.optString("bookingReference", ""));
            }
            
            sendBroadcast(broadcast);
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur parsing session", e);
        }
    }
    
    private String formatAmount(int amountCents, String currency) {
        double amount = amountCents / 100.0;
        return String.format("%.2f %s", amount, currency);
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Paiements Terminal",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifications pour les paiements en attente");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification buildNotification(String text) {
        Intent intent = new Intent(this, DashboardActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Sweet Narcisse - Terminal")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_send)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }
    
    private void updateNotification(String text) {
        Notification notification = buildNotification(text);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, notification);
    }
}
