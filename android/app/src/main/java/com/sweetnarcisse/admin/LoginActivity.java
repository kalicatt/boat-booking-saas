package com.sweetnarcisse.admin;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sweetnarcisse.admin.api.ApiClient;
import com.sweetnarcisse.admin.api.AuthService;
import com.sweetnarcisse.admin.models.LoginRequest;
import com.sweetnarcisse.admin.models.LoginResponse;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

/**
 * Écran de connexion pour les employés
 */
public class LoginActivity extends AppCompatActivity {
    
    private static final String TAG = "LoginActivity";
    private static final String PREFS_NAME = "SweetNarcissePrefs";
    
    private EditText emailInput;
    private EditText passwordInput;
    private Button loginButton;
    private ProgressBar loadingSpinner;
    
    private AuthService authService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        
        // Initialiser les vues
        emailInput = findViewById(R.id.email_input);
        passwordInput = findViewById(R.id.password_input);
        loginButton = findViewById(R.id.login_button);
        loadingSpinner = findViewById(R.id.loading_spinner);
        
        // Initialiser le service API
        authService = new AuthService(ApiClient.getClient(this));
        
        // Bouton de connexion
        loginButton.setOnClickListener(v -> attemptLogin());
    }
    
    private void attemptLogin() {
        // Réinitialiser les erreurs
        emailInput.setError(null);
        passwordInput.setError(null);
        
        // Récupérer les valeurs
        String email = emailInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        
        // Validation
        boolean cancel = false;
        View focusView = null;
        
        if (TextUtils.isEmpty(password)) {
            passwordInput.setError("Mot de passe requis");
            focusView = passwordInput;
            cancel = true;
        }
        
        if (TextUtils.isEmpty(email)) {
            emailInput.setError("Email requis");
            focusView = emailInput;
            cancel = true;
        } else if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            emailInput.setError("Email invalide");
            focusView = emailInput;
            cancel = true;
        }
        
        if (cancel) {
            focusView.requestFocus();
        } else {
            showProgress(true);
            performLogin(email, password);
        }
    }
    
    private void performLogin(String email, String password) {
        Log.d(TAG, "Tentative de connexion pour: " + email);
        
        authService.login(email, password, new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Erreur réseau lors de la connexion", e);
                runOnUiThread(() -> {
                    showProgress(false);
                    showError("Erreur de connexion. Vérifiez votre connexion internet.");
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                final boolean success = response.isSuccessful();
                final String body = response.body() != null ? response.body().string() : "";
                
                runOnUiThread(() -> {
                    showProgress(false);
                    
                    if (success) {
                        handleLoginSuccess(body);
                    } else {
                        handleLoginError(response.code(), body);
                    }
                });
            }
        });
    }
    
    private void handleLoginSuccess(String responseBody) {
        try {
            // Parser la réponse avec org.json
            org.json.JSONObject json = new org.json.JSONObject(responseBody);
            
            if (json.has("user")) {
                org.json.JSONObject user = json.getJSONObject("user");
                String userId = user.optString("id", "");
                String userEmail = user.optString("email", emailInput.getText().toString());
                String firstName = user.optString("firstName", "");
                String lastName = user.optString("lastName", "");
                String role = user.optString("role", "EMPLOYEE");
                
                // Sauvegarder les credentials
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                prefs.edit()
                    .putString("auth_token", json.optString("token", ""))
                    .putString("user_id", userId)
                    .putString("user_email", userEmail)
                    .putString("first_name", firstName)
                    .putString("last_name", lastName)
                    .putString("role", role)
                    .apply();
                
                // Rediriger vers le dashboard
                Intent intent = new Intent(this, DashboardActivity.class);
                startActivity(intent);
                finish();
            } else {
                Log.e(TAG, "Pas de données utilisateur dans la réponse");
                showError("Erreur: Réponse invalide du serveur");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du traitement de la réponse", e);
            showError("Erreur lors de la connexion");
        }
    }
    
    private void handleLoginError(int code, String body) {
        Log.w(TAG, "Échec de connexion. Code: " + code + ", Body: " + body);
        
        String message;
        switch (code) {
            case 401:
                message = "Email ou mot de passe incorrect";
                break;
            case 403:
                message = "Compte désactivé. Contactez un administrateur.";
                break;
            default:
                message = "Erreur de connexion (code " + code + ")";
        }
        
        showError(message);
    }
    
    private void showProgress(boolean show) {
        loadingSpinner.setVisibility(show ? View.VISIBLE : View.GONE);
        loginButton.setEnabled(!show);
        emailInput.setEnabled(!show);
        passwordInput.setEnabled(!show);
    }
    
    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
