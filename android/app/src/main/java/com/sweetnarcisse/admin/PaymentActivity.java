package com.sweetnarcisse.admin;

import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.sweetnarcisse.admin.api.PaymentService;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

/**
 * Activité de paiement Tap to Pay
 * 
 * 2 modes:
 * - Mode "manual": Employé entre le montant manuellement
 * - Mode "triggered": Déclenché depuis QuickBookingModal web avec montant pré-rempli
 */
public class PaymentActivity extends AppCompatActivity {
    
    private static final String TAG = "PaymentActivity";
    
    private TextView modeLabel;
    private TextView customerNameText;
    private TextView bookingReferenceText;
    private TextInputEditText amountInput;
    private MaterialButton collectPaymentButton;
    private MaterialButton cancelButton;
    
    private PaymentService paymentService;
    
    private String mode = "manual"; // "manual" ou "triggered"
    private String sessionId;
    private String bookingId;
    private int amountCents;
    private String currency = "EUR";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Nouveau paiement");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // Bind views
        modeLabel = findViewById(R.id.modeLabel);
        customerNameText = findViewById(R.id.customerNameText);
        bookingReferenceText = findViewById(R.id.bookingReferenceText);
        amountInput = findViewById(R.id.amountInput);
        collectPaymentButton = findViewById(R.id.collectPaymentButton);
        cancelButton = findViewById(R.id.cancelButton);
        
        // Initialiser API
        paymentService = new PaymentService();
        
        // Charger les paramètres intent
        loadIntent();
        
        // Setup buttons
        collectPaymentButton.setOnClickListener(v -> startPaymentCollection());
        cancelButton.setOnClickListener(v -> finish());
    }
    
    private void loadIntent() {
        mode = getIntent().getStringExtra("mode");
        
        if ("triggered".equals(mode)) {
            // Mode déclenché depuis web
            sessionId = getIntent().getStringExtra("sessionId");
            bookingId = getIntent().getStringExtra("bookingId");
            amountCents = getIntent().getIntExtra("amountCents", 0);
            currency = getIntent().getStringExtra("currency");
            String customerName = getIntent().getStringExtra("customerName");
            String bookingReference = getIntent().getStringExtra("bookingReference");
            
            Log.d(TAG, "Mode triggered: session=" + sessionId + ", montant=" + amountCents);
            
            // Afficher les infos
            modeLabel.setText("🌐 Paiement déclenché depuis le web");
            customerNameText.setText(customerName != null && !customerName.isEmpty() 
                ? customerName : "Client");
            bookingReferenceText.setText(bookingReference != null && !bookingReference.isEmpty()
                ? "Réf: " + bookingReference : "");
            
            // Pré-remplir le montant (readonly)
            double amount = amountCents / 100.0;
            amountInput.setText(String.format("%.2f", amount));
            amountInput.setEnabled(false);
            
        } else {
            // Mode manuel
            modeLabel.setText("💳 Paiement manuel");
            customerNameText.setText("Entrez le montant à encaisser");
            bookingReferenceText.setText("");
            amountInput.setEnabled(true);
        }
    }
    
    private void startPaymentCollection() {
        // TODO Phase 2: Implémenter Stripe Terminal
        // 1. Si mode triggered: updateSessionStatus(sessionId, "PROCESSING")
        // 2. Discover readers
        // 3. Connect reader
        // 4. Create PaymentIntent
        // 5. Collect payment method
        // 6. Process payment
        // 7. Si succès: updateSessionStatus(sessionId, "SUCCEEDED")
        // 8. Si échec: updateSessionStatus(sessionId, "FAILED", error)
        
        Toast.makeText(this, "Tap to Pay Stripe Terminal - À implémenter Phase 2", Toast.LENGTH_LONG).show();
        
        Log.d(TAG, "TODO: Collecter paiement de " + amountCents + " " + currency);
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
