package com.sweetnarcisse.admin;

import android.app.Application;
import android.util.Log;

import com.stripe.stripeterminal.TerminalApplicationDelegate;

/**
 * Application class pour initialiser Stripe Terminal
 */
public class SweetNarcisseApp extends Application {
    
    private static final String TAG = "SweetNarcisseApp";
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Initialiser Stripe Terminal
        TerminalApplicationDelegate.onCreate(this);
        
        Log.d(TAG, "Sweet Narcisse App v2.0 initialisée");
    }
}
