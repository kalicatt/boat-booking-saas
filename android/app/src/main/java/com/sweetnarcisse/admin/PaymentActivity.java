package com.sweetnarcisse.admin;

import android.app.AlertDialog;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.stripe.stripeterminal.Terminal;
import com.stripe.stripeterminal.external.callable.Callback;
import com.stripe.stripeterminal.external.callable.Cancelable;
import com.stripe.stripeterminal.external.callable.DiscoveryListener;
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback;
import com.stripe.stripeterminal.external.callable.ReaderCallback;
import com.stripe.stripeterminal.external.models.CollectConfiguration;
import com.stripe.stripeterminal.external.models.ConnectionConfiguration;
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration;
import com.stripe.stripeterminal.external.models.PaymentIntent;
import com.stripe.stripeterminal.external.models.PaymentIntentParameters;
import com.stripe.stripeterminal.external.models.Reader;
import com.stripe.stripeterminal.external.models.TerminalException;
import com.sweetnarcisse.admin.api.PaymentService;
import com.sweetnarcisse.admin.terminal.TerminalManager;

import org.json.JSONObject;

import java.io.IOException;
import java.util.List;

import okhttp3.Call;
import okhttp3.Response;

/**
 * Activité de paiement Tap to Pay avec Stripe Terminal
 * 
 * 2 modes:
 * - Mode "manual": Employé entre le montant manuellement
 * - Mode "triggered": Déclenché depuis QuickBookingModal web avec montant pré-rempli
 * 
 * Utilise Stripe Terminal SDK pour la collecte NFC
 */
public class PaymentActivity extends AppCompatActivity {
    
    private static final String TAG = "PaymentActivity";
    
    private TextView modeLabel;
    private TextView customerNameText;
    private TextView bookingReferenceText;
    private TextView statusText;
    private TextInputEditText amountInput;
    private MaterialButton collectPaymentButton;
    private MaterialButton cancelButton;
    private ProgressBar progressBar;
    
    private PaymentService paymentService;
    private TerminalManager terminalManager;
    
    private String mode = "manual";
    private String sessionId;
    private String bookingId;
    private int amountCents;
    private String currency = "EUR";
    private String clientSecret; // Pour mode triggered avec intent pré-créé
    private String locationId;   // Location Stripe Terminal
    
    private Cancelable pendingOperation;
    private PaymentIntent currentPaymentIntent;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment);
        
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Nouveau paiement");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // Bind views
        modeLabel = findViewById(R.id.modeLabel);
        customerNameText = findViewById(R.id.customerNameText);
        bookingReferenceText = findViewById(R.id.bookingReferenceText);
        statusText = findViewById(R.id.statusText);
        amountInput = findViewById(R.id.amountInput);
        collectPaymentButton = findViewById(R.id.collectPaymentButton);
        cancelButton = findViewById(R.id.cancelButton);
        progressBar = findViewById(R.id.progressBar);
        
        paymentService = new PaymentService();
        terminalManager = TerminalManager.getInstance(this);
        
        // Initialiser Stripe Terminal
        try {
            Log.i(TAG, "Initializing Terminal SDK...");
            terminalManager.initialize();
            Log.i(TAG, "Terminal initialized successfully, ready=" + terminalManager.isReady());
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Terminal", e);
            String errorMsg = "Erreur initialisation Terminal: " + e.getMessage();
            new AlertDialog.Builder(this)
                .setTitle("Erreur Terminal")
                .setMessage(errorMsg)
                .setPositiveButton("OK", (d, w) -> finish())
                .setCancelable(false)
                .show();
            return; // Ne pas continuer si Terminal échoue
        }
        
        loadIntent();
        
        collectPaymentButton.setOnClickListener(v -> startPaymentCollection());
        cancelButton.setOnClickListener(v -> cancelAndFinish());
    }
    
    private void loadIntent() {
        mode = getIntent().getStringExtra("mode");
        
        if ("triggered".equals(mode)) {
            sessionId = getIntent().getStringExtra("sessionId");
            bookingId = getIntent().getStringExtra("bookingId");
            amountCents = getIntent().getIntExtra("amountCents", 0);
            currency = getIntent().getStringExtra("currency");
            clientSecret = getIntent().getStringExtra("clientSecret");
            locationId = getIntent().getStringExtra("locationId");
            String customerName = getIntent().getStringExtra("customerName");
            String bookingReference = getIntent().getStringExtra("bookingReference");
            
            Log.d(TAG, "Mode triggered: session=" + sessionId + ", montant=" + amountCents + ", hasSecret=" + (clientSecret != null));
            
            modeLabel.setText("Paiement déclenché depuis le web");
            customerNameText.setText(customerName != null && !customerName.isEmpty() 
                ? customerName : "Client");
            bookingReferenceText.setText(bookingReference != null && !bookingReference.isEmpty()
                ? "Réf: " + bookingReference : "");
            
            double amount = amountCents / 100.0;
            amountInput.setText(String.format("%.2f", amount));
            amountInput.setEnabled(false);
            
        } else {
            mode = "manual";
            modeLabel.setText("Paiement manuel");
            customerNameText.setText("Entrez le montant à encaisser");
            bookingReferenceText.setText("");
            amountInput.setEnabled(true);
        }
    }
    
    private void startPaymentCollection() {
        // Valider le montant
        String amountStr = amountInput.getText().toString();
        if (amountStr.isEmpty()) {
            Toast.makeText(this, "Entrez un montant", Toast.LENGTH_SHORT).show();
            return;
        }
        
        try {
            double amount = Double.parseDouble(amountStr);
            amountCents = (int) Math.round(amount * 100);
            
            if (amountCents <= 0) {
                Toast.makeText(this, "Montant invalide", Toast.LENGTH_SHORT).show();
                return;
            }
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Montant invalide", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Désactiver le bouton
        collectPaymentButton.setEnabled(false);
        amountInput.setEnabled(false);
        
        // Update session status si mode triggered
        if ("triggered".equals(mode) && sessionId != null) {
            updateSessionStatus("PROCESSING", null);
        }
        
        // Étape 1: Découvrir le reader
        discoverReaders();
    }
    
    private void discoverReaders() {
        updateStatus("Recherche du terminal...");
        showProgress();
        
        // Vérifier que Terminal est initialisé
        if (!terminalManager.isReady()) {
            Log.e(TAG, "Terminal not ready, attempting initialization...");
            try {
                terminalManager.initialize();
            } catch (Exception e) {
                Log.e(TAG, "Terminal initialization failed", e);
                hideProgress();
                handleError("Terminal non initialisé: " + e.getMessage());
                return;
            }
        }
        
        // Vérifier si un reader est déjà connecté
        Reader connectedReader = terminalManager.getTerminal().getConnectedReader();
        if (connectedReader != null) {
            Log.d(TAG, "Reader already connected: " + connectedReader.getSerialNumber());
            // Réutiliser le reader connecté
            if (clientSecret != null && !clientSecret.isEmpty()) {
                collectPaymentMethod(clientSecret);
            } else {
                createPaymentIntent();
            }
            return;
        }
        
        // Déterminer si on est en mode debug (simulated)
        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        Log.d(TAG, "Starting reader discovery, simulated=" + isDebuggable);
        
        DiscoveryConfiguration config = new DiscoveryConfiguration.TapToPayDiscoveryConfiguration(isDebuggable);
        
        try {
            pendingOperation = terminalManager.getTerminal().discoverReaders(
                config,
                new DiscoveryListener() {
                    @Override
                    public void onUpdateDiscoveredReaders(List<Reader> readers) {
                        Log.d(TAG, "Readers discovered: " + readers.size());
                        if (!readers.isEmpty()) {
                            // Annuler la découverte et connecter au premier reader
                            if (pendingOperation != null && !pendingOperation.isCompleted()) {
                                pendingOperation.cancel(new Callback() {
                                    @Override
                                    public void onSuccess() {
                                        connectReader(readers.get(0));
                                    }
                                    @Override
                                    public void onFailure(TerminalException e) {
                                        connectReader(readers.get(0));
                                    }
                                });
                            } else {
                                connectReader(readers.get(0));
                            }
                        }
                    }
                },
                new Callback() {
                    @Override
                    public void onSuccess() {
                        Log.d(TAG, "Discovery completed");
                    }
                    
                    @Override
                    public void onFailure(TerminalException e) {
                        Log.e(TAG, "Discovery failed: " + e.getErrorCode() + " - " + e.getErrorMessage(), e);
                        runOnUiThread(() -> {
                            hideProgress();
                            handleError("Impossible de trouver le terminal: " + e.getErrorMessage());
                        });
                    }
                }
            );
        } catch (Exception e) {
            Log.e(TAG, "discoverReaders threw exception", e);
            hideProgress();
            handleError("Erreur découverte: " + e.getMessage());
        }
    }
    
    private void connectReader(Reader reader) {
        updateStatus("Connexion au terminal...");
        
        // Configuration de connexion Tap to Pay
        // Utiliser locationId de l'intent ou la location par défaut Sweet Narcisse
        String location = locationId != null ? locationId : "tml_GS5EAgOYFgyW33";
        ConnectionConfiguration config = new ConnectionConfiguration.TapToPayConnectionConfiguration(
            location,
            true,  // autoReconnectOnUnexpectedDisconnect
            null   // TapToPayReaderListener optionnel
        );
        
        terminalManager.getTerminal().connectReader(reader, config, new ReaderCallback() {
            @Override
            public void onSuccess(Reader connectedReader) {
                Log.d(TAG, "Reader connected: " + connectedReader.getSerialNumber());
                runOnUiThread(() -> {
                    // Si on a déjà un clientSecret (mode triggered), on skip la création
                    if (clientSecret != null && !clientSecret.isEmpty()) {
                        collectPaymentMethod(clientSecret);
                    } else {
                        createPaymentIntent();
                    }
                });
            }
            
            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "Connection failed", e);
                runOnUiThread(() -> {
                    hideProgress();
                    handleError("Connexion terminal échouée: " + e.getErrorMessage());
                });
            }
        });
    }
    
    private void createPaymentIntent() {
        updateStatus("Création du paiement...");
        
        // En mode triggered, le PaymentIntent est déjà créé par le backend
        // On doit juste le collecter avec le clientSecret
        if ("triggered".equals(mode) && clientSecret != null && !clientSecret.isEmpty()) {
            collectPaymentMethod(clientSecret);
            return;
        }
        
        // Mode manuel: créer PaymentIntent local via Terminal SDK
        PaymentIntentParameters params = new PaymentIntentParameters.Builder()
            .setAmount((long) amountCents)
            .setCurrency(currency.toLowerCase())
            .build();
        
        terminalManager.getTerminal().createPaymentIntent(params, new PaymentIntentCallback() {
            @Override
            public void onSuccess(PaymentIntent paymentIntent) {
                Log.d(TAG, "PaymentIntent created: " + paymentIntent.getId());
                currentPaymentIntent = paymentIntent;
                runOnUiThread(() -> collectPaymentMethod(null));
            }
            
            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "Create intent failed", e);
                runOnUiThread(() -> {
                    hideProgress();
                    handleError("Création paiement échouée: " + e.getErrorMessage());
                });
            }
        });
    }
    
    private void collectPaymentMethod(String clientSecret) {
        updateStatus("Présentez la carte...");
        
        // CollectConfiguration pour Stripe Terminal 4.x
        CollectConfiguration config = new CollectConfiguration.Builder()
            .build();
        
        PaymentIntentCallback callback = new PaymentIntentCallback() {
            @Override
            public void onSuccess(PaymentIntent paymentIntent) {
                Log.d(TAG, "Payment collected: " + paymentIntent.getId());
                currentPaymentIntent = paymentIntent;
                runOnUiThread(() -> confirmPayment());
            }
            
            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "Collect failed", e);
                runOnUiThread(() -> {
                    hideProgress();
                    handleError("Collection échouée: " + e.getErrorMessage());
                });
            }
        };
        
        if (clientSecret != null && !clientSecret.isEmpty()) {
            // Retrieve + collect avec client secret du backend
            terminalManager.getTerminal().retrievePaymentIntent(clientSecret, new PaymentIntentCallback() {
                @Override
                public void onSuccess(PaymentIntent paymentIntent) {
                    currentPaymentIntent = paymentIntent;
                    // Stripe Terminal 4.x: collectPaymentMethod(paymentIntent, callback, config)
                    terminalManager.getTerminal().collectPaymentMethod(paymentIntent, callback, config);
                }
                
                @Override
                public void onFailure(TerminalException e) {
                    Log.e(TAG, "Retrieve intent failed", e);
                    runOnUiThread(() -> {
                        hideProgress();
                        handleError("Récupération intent échouée: " + e.getErrorMessage());
                    });
                }
            });
        } else {
            // Collect direct avec PaymentIntent local
            terminalManager.getTerminal().collectPaymentMethod(currentPaymentIntent, callback, config);
        }
    }
    
    private void confirmPayment() {
        updateStatus("Traitement du paiement...");
        
        // Stripe Terminal 4.x: confirmPaymentIntent(paymentIntent, callback)
        terminalManager.getTerminal().confirmPaymentIntent(currentPaymentIntent, new PaymentIntentCallback() {
            @Override
            public void onSuccess(PaymentIntent paymentIntent) {
                String status = paymentIntent.getStatus().toString().toLowerCase();
                Log.d(TAG, "Payment confirmed: " + paymentIntent.getId() + ", status: " + status);
                currentPaymentIntent = paymentIntent;
                
                // REQUIRES_CAPTURE est normal pour Terminal - Stripe capture automatiquement
                // SUCCEEDED signifie déjà capturé
                if ("succeeded".equals(status) || "requires_capture".equals(status)) {
                    runOnUiThread(() -> handlePaymentSuccess());
                } else {
                    runOnUiThread(() -> {
                        hideProgress();
                        handleError("Paiement non réussi: " + paymentIntent.getStatus());
                    });
                }
            }
            
            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "Confirm failed", e);
                runOnUiThread(() -> {
                    hideProgress();
                    handleError("Traitement échoué: " + e.getErrorMessage());
                });
            }
        });
    }
    
    private void handlePaymentSuccess() {
        updateStatus("Paiement réussi !");
        
        if ("triggered".equals(mode) && sessionId != null) {
            // Confirmer le paiement côté backend (mode triggered avec réservation)
            paymentService.confirmPayment(sessionId, currentPaymentIntent.getId(), new okhttp3.Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    Log.e(TAG, "Confirm API failed", e);
                    runOnUiThread(() -> {
                        hideProgress();
                        // Paiement OK mais confirm failed
                        Toast.makeText(PaymentActivity.this, 
                            "Paiement réussi mais erreur de synchronisation", 
                            Toast.LENGTH_LONG).show();
                        finishSuccess();
                    });
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    runOnUiThread(() -> {
                        hideProgress();
                        if (response.isSuccessful()) {
                            updateSessionStatus("SUCCEEDED", null);
                            Toast.makeText(PaymentActivity.this, 
                                "Paiement confirmé !", 
                                Toast.LENGTH_SHORT).show();
                        }
                        finishSuccess();
                    });
                }
            });
        } else {
            // Mode manuel: enregistrer le paiement dans le backend
            Log.d(TAG, "Recording manual payment: " + currentPaymentIntent.getId() + ", amount=" + amountCents);
            paymentService.recordManualPayment(
                currentPaymentIntent.getId(),
                amountCents,
                currency,
                "Paiement Tap to Pay manuel",
                new okhttp3.Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        Log.e(TAG, "Record payment failed", e);
                        runOnUiThread(() -> {
                            hideProgress();
                            Toast.makeText(PaymentActivity.this, 
                                "Paiement réussi mais non enregistré", 
                                Toast.LENGTH_LONG).show();
                            finishSuccess();
                        });
                    }
                    
                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        String responseBody = response.body() != null ? response.body().string() : "";
                        Log.d(TAG, "Record payment response: " + response.code() + " - " + responseBody);
                        runOnUiThread(() -> {
                            hideProgress();
                            if (response.isSuccessful()) {
                                Toast.makeText(PaymentActivity.this, 
                                    "Paiement enregistré !", 
                                    Toast.LENGTH_SHORT).show();
                            } else {
                                Toast.makeText(PaymentActivity.this, 
                                    "Paiement réussi (sync partielle)", 
                                    Toast.LENGTH_SHORT).show();
                            }
                            finishSuccess();
                        });
                    }
                }
            );
        }
    }
    
    private void handleError(String message) {
        Log.e(TAG, "Payment error: " + message);
        updateStatus("❌ " + message);
        collectPaymentButton.setEnabled(true);
        
        if ("manual".equals(mode)) {
            amountInput.setEnabled(true);
        }
        
        if ("triggered".equals(mode) && sessionId != null) {
            updateSessionStatus("FAILED", message);
        }
        
        // Afficher un dialog d'erreur au lieu d'un Toast
        new AlertDialog.Builder(this)
            .setTitle("Erreur de paiement")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show();
    }
    
    private void updateSessionStatus(String status, String error) {
        if (sessionId == null) return;
        
        paymentService.updateSessionStatus(sessionId, status, error, new okhttp3.Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.w(TAG, "Update session status failed", e);
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                Log.d(TAG, "Session status updated to: " + status);
            }
        });
    }
    
    private void updateStatus(String text) {
        runOnUiThread(() -> statusText.setText(text));
    }
    
    private void showProgress() {
        runOnUiThread(() -> progressBar.setVisibility(View.VISIBLE));
    }
    
    private void hideProgress() {
        runOnUiThread(() -> progressBar.setVisibility(View.GONE));
    }
    
    private void finishSuccess() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> finish(), 2000);
    }
    
    private void cancelAndFinish() {
        if (pendingOperation != null) {
            pendingOperation.cancel(new Callback() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "Operation cancelled");
                }
                
                @Override
                public void onFailure(TerminalException e) {
                    Log.w(TAG, "Cancel failed", e);
                }
            });
        }
        
        if ("triggered".equals(mode) && sessionId != null) {
            updateSessionStatus("FAILED", "Cancelled by user");
        }
        
        finish();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (pendingOperation != null && !pendingOperation.isCompleted()) {
            pendingOperation.cancel(new Callback() {
                @Override
                public void onSuccess() {}
                
                @Override
                public void onFailure(TerminalException e) {}
            });
        }
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        cancelAndFinish();
        return true;
    }
}
