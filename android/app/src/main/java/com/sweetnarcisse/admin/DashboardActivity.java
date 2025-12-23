package com.sweetnarcisse.admin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.sweetnarcisse.admin.api.ApiClient;
import com.sweetnarcisse.admin.api.AuthService;
import com.sweetnarcisse.admin.api.StatsService;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

import org.json.JSONObject;

import java.io.IOException;
import java.util.Locale;

/**
 * Dashboard principal de l'application
 * Affiche les statistiques du jour et les actions rapides
 * Démarre le service de polling des paiements
 */
public class DashboardActivity extends AppCompatActivity {
    
    private static final String TAG = "DashboardActivity";
    private static final String PREFS_NAME = "SweetNarcissePrefs";
    
    private TextView welcomeText;
    private TextView todayCheckinsText;
    private TextView todayPaymentsText;
    private MaterialButton scanQrButton;
    private MaterialButton newPaymentButton;
    private MaterialButton historyButton;
    private ImageButton logoutButton;
    
    private AuthService authService;
    private StatsService statsService;
    private PaymentSessionReceiver paymentReceiver;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Activer edge-to-edge pour que l'app s'étende sous la barre d'état
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        setContentView(R.layout.activity_dashboard);
        
        // Gérer les insets système (barre d'état, notch, etc.)
        setupEdgeToEdge();
        
        // Initialiser l'API service
        authService = new AuthService(ApiClient.getInstance());
        statsService = new StatsService();
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Sweet Narcisse Admin");
            getSupportActionBar().setDisplayHomeAsUpEnabled(false);
        }
        
        // Bind views
        welcomeText = findViewById(R.id.welcomeText);
        todayCheckinsText = findViewById(R.id.todayCheckinsText);
        todayPaymentsText = findViewById(R.id.todayPaymentsText);
        scanQrButton = findViewById(R.id.scanQrButton);
        newPaymentButton = findViewById(R.id.newPaymentButton);
        historyButton = findViewById(R.id.historyButton);
        logoutButton = findViewById(R.id.logoutButton);
        
        // Charger les infos utilisateur
        loadUserInfo();
        
        // Charger les stats (à implémenter)
        loadTodayStats();
        
        // Setup action buttons
        scanQrButton.setOnClickListener(v -> openScanner());
        newPaymentButton.setOnClickListener(v -> openPayment());
        historyButton.setOnClickListener(v -> openHistory());
        logoutButton.setOnClickListener(v -> confirmLogout());
        
        // Démarrer le service de polling des paiements
        startPaymentPollingService();
        
        // Enregistrer le receiver pour les sessions de paiement
        paymentReceiver = new PaymentSessionReceiver();
        IntentFilter filter = new IntentFilter("com.sweetnarcisse.PAYMENT_SESSION_CLAIMED");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(paymentReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(paymentReceiver, filter);
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Recharger les stats au retour sur le dashboard
        loadTodayStats();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (paymentReceiver != null) {
            unregisterReceiver(paymentReceiver);
        }
    }
    
    private void startPaymentPollingService() {
        Intent serviceIntent = new Intent(this, PaymentPollingService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        Log.d(TAG, "Service de polling démarré");
    }
    
    private void loadUserInfo() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String firstName = prefs.getString("first_name", "");
        String lastName = prefs.getString("last_name", "");
        String email = prefs.getString("user_email", "");
        
        String welcomeMessage;
        if (!firstName.isEmpty()) {
            welcomeMessage = "Bonjour, " + firstName;
        } else {
            welcomeMessage = "Bonjour, " + email;
        }
        
        welcomeText.setText(welcomeMessage);
    }
    
    private void loadTodayStats() {
        statsService.getTodayStats(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Erreur lors du chargement des stats", e);
                runOnUiThread(() -> {
                    todayCheckinsText.setText("0");
                    todayPaymentsText.setText("0 €");
                });
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful() && response.body() != null) {
                    try {
                        String responseBody = response.body().string();
                        JSONObject json = new JSONObject(responseBody);
                        JSONObject today = json.getJSONObject("today");
                        
                        int checkinsCount = today.getInt("checkinsCount");
                        int paymentsCount = today.getInt("paymentsCount");
                        double totalAmount = today.getDouble("totalAmount");
                        
                        runOnUiThread(() -> {
                            todayCheckinsText.setText(String.valueOf(checkinsCount));
                            // Format compact: "150 €" ou "1 250 €"
                            todayPaymentsText.setText(String.format(Locale.FRENCH, "%,.0f €", totalAmount));
                        });
                        
                        Log.d(TAG, "Stats chargées: " + checkinsCount + " check-ins, " + paymentsCount + " paiements, " + totalAmount + " €");
                        
                    } catch (Exception e) {
                        Log.e(TAG, "Erreur parsing stats", e);
                        runOnUiThread(() -> {
                            todayCheckinsText.setText("0");
                            todayPaymentsText.setText("0 €");
                        });
                    }
                } else {
                    Log.w(TAG, "Réponse stats non-200: " + response.code());
                    runOnUiThread(() -> {
                        todayCheckinsText.setText("0");
                        todayPaymentsText.setText("0 €");
                    });
                }
            }
        });
    }
    
    private void openScanner() {
        Intent intent = new Intent(this, ScannerActivity.class);
        startActivity(intent);
    }
    
    private void openPayment() {
        Intent intent = new Intent(this, PaymentActivity.class);
        startActivity(intent);
    }
    
    private void openHistory() {
        Intent intent = new Intent(this, HistoryActivity.class);
        startActivity(intent);
    }
    
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.dashboard_menu, menu);
        return true;
    }
    
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        
        if (id == R.id.action_settings) {
            openSettings();
            return true;
        } else if (id == R.id.action_logout) {
            logout();
            return true;
        }
        
        return super.onOptionsItemSelected(item);
    }
    
    private void openSettings() {
        Intent intent = new Intent(this, SettingsActivity.class);
        startActivity(intent);
    }
    
    private void confirmLogout() {
        new AlertDialog.Builder(this)
            .setTitle("Déconnexion")
            .setMessage("Êtes-vous sûr de vouloir vous déconnecter ?")
            .setPositiveButton("Déconnexion", (dialog, which) -> logout())
            .setNegativeButton("Annuler", null)
            .show();
    }
    
    private void logout() {
        authService.logout(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Erreur lors de la déconnexion", e);
                // Déconnecter quand même localement
                clearSessionAndRedirect();
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                clearSessionAndRedirect();
            }
        });
    }
    
    private void clearSessionAndRedirect() {
        runOnUiThread(() -> {
            // Effacer la session
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().clear().apply();
            
            // Rediriger vers le login
            Intent intent = new Intent(this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });
    }
    
    /**
     * BroadcastReceiver pour les sessions de paiement claimed
     * Ouvre PaymentActivity avec les données pré-remplies
     */
    private class PaymentSessionReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String sessionId = intent.getStringExtra("sessionId");
            String bookingId = intent.getStringExtra("bookingId");
            int amountCents = intent.getIntExtra("amountCents", 0);
            String currency = intent.getStringExtra("currency");
            String customerName = intent.getStringExtra("customerName");
            String bookingReference = intent.getStringExtra("bookingReference");
            
            Log.i(TAG, "Paiement reçu: " + amountCents + " " + currency + " pour " + bookingReference);
            
            // Toast notification
            Toast.makeText(context, 
                "Nouveau paiement: " + (amountCents / 100.0) + " " + currency,
                Toast.LENGTH_LONG).show();
            
            // Ouvrir PaymentActivity avec les données
            Intent paymentIntent = new Intent(context, PaymentActivity.class);
            paymentIntent.putExtra("mode", "triggered"); // Mode déclenché depuis web
            paymentIntent.putExtra("sessionId", sessionId);
            paymentIntent.putExtra("bookingId", bookingId);
            paymentIntent.putExtra("amountCents", amountCents);
            paymentIntent.putExtra("currency", currency);
            paymentIntent.putExtra("customerName", customerName);
            paymentIntent.putExtra("bookingReference", bookingReference);
            paymentIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            startActivity(paymentIntent);
        }
    }
    
    /**
     * Configure l'affichage edge-to-edge pour que l'app s'étende
     * sous la barre d'état et contourne le notch/punch hole
     */
    private void setupEdgeToEdge() {
        View statusBarSpacer = findViewById(R.id.statusBarSpacer);
        View headerContainer = findViewById(R.id.headerContainer);
        View rootView = findViewById(android.R.id.content);
        
        // Appliquer les insets sur le root view
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
            
            // Prendre le max entre status bar et display cutout
            int topInset = Math.max(systemBars.top, displayCutout.top);
            
            // Ajuster le spacer pour la hauteur de la barre d'état + cutout
            if (statusBarSpacer != null) {
                ViewGroup.LayoutParams params = statusBarSpacer.getLayoutParams();
                params.height = topInset + 8; // +8dp pour un peu d'espace
                statusBarSpacer.setLayoutParams(params);
            }
            
            return windowInsets;
        });
        
        // Forcer la demande d'insets
        if (rootView != null) {
            rootView.requestApplyInsets();
        }
    }
}
