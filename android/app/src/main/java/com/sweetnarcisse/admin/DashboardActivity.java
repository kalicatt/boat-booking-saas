package com.sweetnarcisse.admin;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.sweetnarcisse.admin.api.AuthService;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

import java.io.IOException;

/**
 * Dashboard principal de l'application
 * Affiche les statistiques du jour et les actions rapides
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
    
    private AuthService authService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);
        
        // Initialiser l'API service
        authService = new AuthService();
        
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
        
        // Charger les infos utilisateur
        loadUserInfo();
        
        // Charger les stats (à implémenter)
        loadTodayStats();
        
        // Setup action buttons
        scanQrButton.setOnClickListener(v -> openScanner());
        newPaymentButton.setOnClickListener(v -> openPayment());
        historyButton.setOnClickListener(v -> openHistory());
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
        // TODO: Implémenter l'appel API pour récupérer les stats du jour
        // Pour l'instant, valeurs par défaut
        todayCheckinsText.setText("0 embarquements");
        todayPaymentsText.setText("0 € encaissés");
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
        // TODO: Créer HistoryActivity
        Log.d(TAG, "Historique pas encore implémenté");
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
        // TODO: Créer SettingsActivity
        Log.d(TAG, "Paramètres pas encore implémentés");
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
}
