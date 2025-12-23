package com.sweetnarcisse.admin;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.splashscreen.SplashScreen;

/**
 * MainActivity simplifiée - Point d'entrée de l'application
 * Redirige vers Login ou Dashboard selon l'état d'authentification
 */
public class MainActivity extends AppCompatActivity {
    
    private static final String PREFS_NAME = "SweetNarcissePrefs";
    private static final String KEY_AUTH_TOKEN = "auth_token";
    private static final String KEY_USER_ID = "user_id";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Splash screen Material 3
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // Vérifier si l'utilisateur est déjà connecté
        if (isAuthenticated()) {
            // Rediriger vers le dashboard
            Intent intent = new Intent(this, DashboardActivity.class);
            startActivity(intent);
        } else {
            // Rediriger vers le login
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
        }
        
        // Fermer MainActivity
        finish();
    }
    
    private boolean isAuthenticated() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String token = prefs.getString(KEY_AUTH_TOKEN, null);
        String userId = prefs.getString(KEY_USER_ID, null);
        return token != null && !token.isEmpty() && userId != null && !userId.isEmpty();
    }
}
