package com.sweetnarcisse.admin.terminal;

import android.content.Context;
import android.provider.Settings;
import android.util.Log;

import com.stripe.stripeterminal.Terminal;
import com.stripe.stripeterminal.external.callable.TerminalListener;
import com.stripe.stripeterminal.external.models.Reader;
import com.stripe.stripeterminal.external.models.TerminalException;
import com.stripe.stripeterminal.log.LogLevel;

/**
 * Gestionnaire centralisé pour Stripe Terminal
 * 
 * Initialise le SDK une seule fois et gère les événements globaux
 */
public class TerminalManager {
    
    private static final String TAG = "TerminalManager";
    
    private static TerminalManager instance;
    private static boolean isInitialized = false;
    
    private final Context context;
    private final SweetNarcisseTokenProvider tokenProvider;
    private String deviceId;
    
    private TerminalManager(Context context) {
        this.context = context.getApplicationContext();
        this.tokenProvider = new SweetNarcisseTokenProvider();
        this.deviceId = Settings.Secure.getString(
            context.getContentResolver(), 
            Settings.Secure.ANDROID_ID
        );
        this.tokenProvider.setDeviceId(deviceId);
    }
    
    public static synchronized TerminalManager getInstance(Context context) {
        if (instance == null) {
            instance = new TerminalManager(context);
        }
        return instance;
    }
    
    public static boolean isTerminalInitialized() {
        return isInitialized;
    }
    
    public String getDeviceId() {
        return deviceId;
    }
    
    /**
     * Initialiser le SDK Terminal
     * À appeler avant toute opération Terminal
     */
    public synchronized void initialize() {
        if (isInitialized) {
            Log.d(TAG, "Terminal already initialized");
            return;
        }
        
        try {
            if (!Terminal.isInitialized()) {
                // TerminalListener vide - SDK 4.x utilise des méthodes par défaut
                TerminalListener listener = new TerminalListener() {};
                
                Terminal.initTerminal(
                    context,
                    LogLevel.VERBOSE,  // En dev, utiliser VERBOSE pour debug
                    tokenProvider,
                    listener
                );
                Log.i(TAG, "Stripe Terminal SDK initialized successfully");
            }
            isInitialized = true;
        } catch (TerminalException e) {
            Log.e(TAG, "Failed to initialize Terminal SDK", e);
            throw new RuntimeException("Terminal initialization failed: " + e.getErrorMessage(), e);
        }
    }
    
    /**
     * Vérifier si Terminal est prêt à être utilisé
     */
    public boolean isReady() {
        return isInitialized && Terminal.isInitialized();
    }
    
    /**
     * Obtenir l'instance Terminal (initialise si nécessaire)
     */
    public Terminal getTerminal() {
        if (!isReady()) {
            initialize();
        }
        return Terminal.getInstance();
    }
}
