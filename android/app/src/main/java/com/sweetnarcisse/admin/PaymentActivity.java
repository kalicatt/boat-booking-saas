package com.sweetnarcisse.admin;

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
    
    private String mode = "manual";
    private String sessionId;
    private String bookingId;
    private int amountCents;
    private String currency = "EUR";
    
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
            String customerName = getIntent().getStringExtra("customerName");
            String bookingReference = getIntent().getStringExtra("bookingReference");
            
            Log.d(TAG, "Mode triggered: session=" + sessionId + ", montant=" + amountCents);
            
            modeLabel.setText("🌐 Paiement déclenché depuis le web");
            customerNameText.setText(customerName != null && !customerName.isEmpty() 
                ? customerName : "Client");
            bookingReferenceText.setText(bookingReference != null && !bookingReference.isEmpty()
                ? "Réf: " + bookingReference : "");
            
            double amount = amountCents / 100.0;
            amountInput.setText(String.format("%.2f", amount));
            amountInput.setEnabled(false);
            
        } else {
            modeLabel.setText("💳 Paiement manuel");
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
        
        DiscoveryConfiguration config = new DiscoveryConfiguration.LocalMobileDiscoveryConfiguration();
        
        pendingOperation = Terminal.getInstance().discoverReaders(
            config,
            new Terminal.DiscoveryListener() {
                @Override
                public void onUpdateDiscoveredReaders(List<Reader> readers) {
                    Log.d(TAG, "Readers discovered: " + readers.size());
                    if (!readers.isEmpty()) {
                        // Connecter au premier reader (local mobile)
                        connectReader(readers.get(0));
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
                    Log.e(TAG, "Discovery failed", e);
                    runOnUiThread(() -> {
                        hideProgress();
                        handleError("Impossible de trouver le terminal: " + e.getErrorMessage());
                    });
                }
            }
        );
    }
    
    private void connectReader(Reader reader) {
        updateStatus("Connexion au terminal...");
        
        ConnectionConfiguration config = new ConnectionConfiguration.LocalMobileConnectionConfiguration();
        
        Terminal.getInstance().connectReader(reader, config, new ReaderCallback() {
            @Override
            public void onSuccess(Reader connectedReader) {
                Log.d(TAG, "Reader connected: " + connectedReader.getSerialNumber());
                runOnUiThread(() -> createPaymentIntent());
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
        
        if ("triggered".equals(mode) && sessionId != null && bookingId != null) {
            // Utiliser l'API backend pour créer le PaymentIntent
            paymentService.createPaymentIntent(sessionId, bookingId, amountCents, new okhttp3.Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    Log.e(TAG, "Create intent API failed", e);
                    runOnUiThread(() -> {
                        hideProgress();
                        handleError("Erreur réseau: " + e.getMessage());
                    });
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    String body = response.body().string();
                    
                    if (response.isSuccessful()) {
                        try {
                            JSONObject json = new JSONObject(body);
                            JSONObject paymentIntent = json.getJSONObject("paymentIntent");
                            String clientSecret = paymentIntent.getString("clientSecret");
                            
                            runOnUiThread(() -> collectPaymentMethod(clientSecret));
                        } catch (Exception e) {
                            Log.e(TAG, "Parse intent failed", e);
                            runOnUiThread(() -> {
                                hideProgress();
                                handleError("Erreur parsing réponse");
                            });
                        }
                    } else {
                        runOnUiThread(() -> {
                            hideProgress();
                            handleError("Erreur création paiement: " + response.code());
                        });
                    }
                }
            });
        } else {
            // Mode manuel: créer PaymentIntent local
            PaymentIntentParameters params = new PaymentIntentParameters.Builder()
                .setAmount((long) amountCents)
                .setCurrency(currency.toLowerCase())
                .build();
            
            Terminal.getInstance().createPaymentIntent(params, new PaymentIntentCallback() {
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
    }
    
    private void collectPaymentMethod(String clientSecret) {
        updateStatus("Présentez la carte...");
        
        CollectConfiguration config = new CollectConfiguration.Builder()
            .setSkipTipping(true)
            .build();
        
        PaymentIntentCallback callback = new PaymentIntentCallback() {
            @Override
            public void onSuccess(PaymentIntent paymentIntent) {
                Log.d(TAG, "Payment collected: " + paymentIntent.getId());
                currentPaymentIntent = paymentIntent;
                runOnUiThread(() -> processPayment());
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
        
        if (clientSecret != null) {
            // Retrieve + collect avec client secret du backend
            Terminal.getInstance().retrievePaymentIntent(clientSecret, new PaymentIntentCallback() {
                @Override
                public void onSuccess(PaymentIntent paymentIntent) {
                    currentPaymentIntent = paymentIntent;
                    Terminal.getInstance().collectPaymentMethod(paymentIntent, config, callback);
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
            Terminal.getInstance().collectPaymentMethod(currentPaymentIntent, config, callback);
        }
    }
    
    private void processPayment() {
        updateStatus("Traitement du paiement...");
        
        Terminal.getInstance().processPayment(currentPaymentIntent, new PaymentIntentCallback() {
            @Override
            public void onSuccess(PaymentIntent paymentIntent) {
                Log.d(TAG, "Payment processed: " + paymentIntent.getId() + ", status: " + paymentIntent.getStatus());
                currentPaymentIntent = paymentIntent;
                
                if ("succeeded".equals(paymentIntent.getStatus().toString().toLowerCase())) {
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
                Log.e(TAG, "Process failed", e);
                runOnUiThread(() -> {
                    hideProgress();
                    handleError("Traitement échoué: " + e.getErrorMessage());
                });
            }
        });
    }
    
    private void handlePaymentSuccess() {
        updateStatus("✅ Paiement réussi !");
        
        if ("triggered".equals(mode) && sessionId != null) {
            // Confirmer le paiement côté backend
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
            hideProgress();
            Toast.makeText(this, "Paiement réussi !", Toast.LENGTH_SHORT).show();
            finishSuccess();
        }
    }
    
    private void handleError(String message) {
        updateStatus("❌ " + message);
        collectPaymentButton.setEnabled(true);
        
        if ("manual".equals(mode)) {
            amountInput.setEnabled(true);
        }
        
        if ("triggered".equals(mode) && sessionId != null) {
            updateSessionStatus("FAILED", message);
        }
        
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
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
