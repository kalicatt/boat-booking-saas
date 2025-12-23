package com.sweetnarcisse.admin;

import android.app.Application;
import android.util.Log;

import com.stripe.stripeterminal.TerminalApplicationDelegate;
import com.stripe.stripeterminal.taptopay.TapToPay;
import com.sweetnarcisse.admin.api.ApiClient;

/**
 * Application class pour initialiser Stripe Terminal et ApiClient
 */
public class SweetNarcisseApp extends Application {
    
    private static final String TAG = "SweetNarcisseApp";
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Skip initialization if running in the TTPA secure process
        if (TapToPay.isInTapToPayProcess()) {
            Log.d(TAG, "Running in Tap to Pay process, skipping initialization");
            return;
        }
        
        // Initialiser ApiClient avec le contexte Application
        ApiClient.init(this);
        
        // Initialiser Stripe Terminal
        TerminalApplicationDelegate.onCreate(this);
        
        Log.d(TAG, "Sweet Narcisse App v2.0 initialisée");
    }
}
