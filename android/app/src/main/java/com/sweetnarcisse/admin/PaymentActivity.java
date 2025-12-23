package com.sweetnarcisse.admin;

import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

/**
 * Activité de paiement Tap to Pay (à implémenter)
 */
public class PaymentActivity extends AppCompatActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Nouveau paiement");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // TODO: Implémenter Stripe Terminal Tap to Pay
        Toast.makeText(this, "Tap to Pay - À implémenter", Toast.LENGTH_SHORT).show();
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
