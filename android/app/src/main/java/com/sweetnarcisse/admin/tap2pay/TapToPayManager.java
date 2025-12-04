package com.sweetnarcisse.admin.tap2pay;

import android.annotation.SuppressLint;
import android.content.pm.ApplicationInfo;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.webkit.CookieManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.sweetnarcisse.admin.MainActivity;
import com.stripe.stripeterminal.Terminal;
import com.stripe.stripeterminal.external.callable.Callback;
import com.stripe.stripeterminal.external.callable.Cancelable;
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback;
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider;
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback;
import com.stripe.stripeterminal.external.callable.ReaderCallback;
import com.stripe.stripeterminal.external.callable.TapToPayReaderListener;
import com.stripe.stripeterminal.external.callable.TerminalListener;
import com.stripe.stripeterminal.log.LogLevel;
import com.stripe.stripeterminal.external.models.ConnectionConfiguration;
import com.stripe.stripeterminal.external.models.ConnectionStatus;
import com.stripe.stripeterminal.external.models.ConnectionTokenException;
import com.stripe.stripeterminal.external.models.DisconnectReason;
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration;
import com.stripe.stripeterminal.external.models.PaymentIntent;
import com.stripe.stripeterminal.external.models.PaymentStatus;
import com.stripe.stripeterminal.external.models.Reader;
import com.stripe.stripeterminal.external.models.TerminalException;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Native helper that keeps the Stripe Tap to Pay stack in sync with the Next.js API.
 * The manager is intentionally minimal: it establishes the SDK singleton, polls for
 * pending sessions destined for this device, and drives the PaymentIntent lifecycle.
 */
public class TapToPayManager implements TerminalListener, ConnectionTokenProvider {
    private static final String TAG = "TapToPayManager";
    private static final long POLL_INTERVAL_MS = 4_000L;
    private static final long LOCATION_RETRY_MS = 15_000L;
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private final MainActivity activity;
    private final OkHttpClient httpClient;
    private final ScheduledExecutorService scheduler;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private final AtomicBoolean readerConnecting = new AtomicBoolean(false);
    private final AtomicBoolean primingToken = new AtomicBoolean(false);
    private final String deviceId;
    private final List<Reader> discoveredReaders = new ArrayList<>();
    private final Object tokenLock = new Object();

    private Cancelable activeCollectCancelable;
    private Cancelable discoveryCancelable;
    private String cachedConnectionToken;
    private String locationId;
    @Nullable
    private volatile String activeSessionId;

    private final TapToPayReaderListener tapToPayReaderListener = new TapToPayReaderListener() {
        @Override
        public void onReaderReconnectStarted(@NonNull Reader reader, @NonNull Cancelable cancelReconnect, @NonNull DisconnectReason reason) {
            Log.i(TAG, "Tap to Pay reader reconnecting: " + reader.getLabel() + " reason=" + reason.name());
            emitReaderState("reconnecting", reason.name());
        }

        @Override
        public void onReaderReconnectSucceeded(@NonNull Reader reader) {
            Log.i(TAG, "Tap to Pay reader reconnected: " + reader.getLabel());
            emitReaderState("connected", reader.getLabel());
        }

        @Override
        public void onReaderReconnectFailed(@NonNull Reader reader) {
            Log.w(TAG, "Tap to Pay reader reconnect failed: " + reader.getLabel());
            readerConnecting.set(false);
            ensureReaderConnected();
            emitReaderState("disconnected", "Perte de connexion");
        }

        @Override
        public void onDisconnect(@NonNull DisconnectReason reason) {
            Log.w(TAG, "Tap to Pay reader disconnected: " + reason.name());
            readerConnecting.set(false);
            ensureReaderConnected();
            emitReaderState("disconnected", reason.name());
        }
    };

    public TapToPayManager(MainActivity activity) {
        this.activity = activity;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .build();
        this.scheduler = Executors.newSingleThreadScheduledExecutor();
        this.deviceId = buildDeviceId();
    }

    public void start() {
        if (running.getAndSet(true)) {
            return;
        }
        ensureTerminalInitialized();
        ensureReaderConnected();
        scheduler.schedule(this::pollNextSessionSafe, POLL_INTERVAL_MS, TimeUnit.MILLISECONDS);
        emitReaderState("watching", null);
    }

    public void stop() {
        running.set(false);
        busy.set(false);
        readerConnecting.set(false);
        primingToken.set(false);
        activeSessionId = null;
        if (activeCollectCancelable != null) {
            activeCollectCancelable.cancel(createNoopCallback("collect-cancel"));
            activeCollectCancelable = null;
        }
        cancelDiscovery();
        emitReaderState("idle", null);
    }

    public void destroy() {
        stop();
        scheduler.shutdownNow();
    }

    public void cancelActivePaymentFlow(@NonNull String reason) {
        if (!busy.get() && activeCollectCancelable == null && activeSessionId == null) {
            return;
        }
        Log.i(TAG, "Lifecycle cancel requested: " + reason);
        if (activeCollectCancelable != null) {
            activeCollectCancelable.cancel(createNoopCallback("collect-cancel"));
            activeCollectCancelable = null;
        }
        String sessionId = activeSessionId;
        activeSessionId = null;
        if (sessionId != null) {
            handleFailure(sessionId, reason);
        } else {
            busy.set(false);
        }
    }

    private void pollNextSessionSafe() {
        if (!running.get()) {
            return;
        }
        try {
            pollNextSession();
        } catch (Exception e) {
            Log.w(TAG, "poll error", e);
        } finally {
            if (running.get()) {
                scheduler.schedule(this::pollNextSessionSafe, POLL_INTERVAL_MS, TimeUnit.MILLISECONDS);
            }
        }
    }

    private void pollNextSession() throws IOException, JSONException {
        if (busy.get()) {
            return;
        }
        String origin = activity.resolveCurrentOrigin();
        if (origin == null) {
            Log.d(TAG, "No origin resolved yet, skipping poll");
            return;
        }
        String cookieHeader = resolveCookieHeader(origin);
        if (cookieHeader == null) {
            Log.d(TAG, "No auth cookie set, skipping poll");
            return;
        }
        String url = origin + "/api/payments/terminal/session/next?deviceId=" + deviceId;
        Request request = new Request.Builder()
                .url(url)
                .get()
                .addHeader("Cookie", cookieHeader)
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (response.code() == 204 || response.body() == null) {
                return;
            }
            if (!response.isSuccessful()) {
                Log.w(TAG, "session/next failed: " + response.code());
                return;
            }
            String body = response.body().string();
            if (TextUtils.isEmpty(body)) {
                return;
            }
            JSONObject payload = new JSONObject(body);
            if (!payload.has("session") || payload.isNull("session")) {
                return;
            }
            busy.set(true);
            JSONObject session = payload.getJSONObject("session");
            mainHandler.post(() -> handleRemoteSession(session));
        }
    }

    private void handleRemoteSession(JSONObject sessionJson) {
        try {
            ensureTerminalInitialized();
            ensureReaderConnected();
            String sessionId = sessionJson.getString("id");
            activeSessionId = sessionId;
            String clientSecret = sessionJson.optString("clientSecret", null);
            if (clientSecret == null) {
                Log.e(TAG, "Missing client secret in session " + sessionId);
                activeSessionId = null;
                busy.set(false);
                return;
            }
            emitSessionEvent(sessionId, "claimed", null, sessionJson, null);
            notifyProcessing(sessionId);
            retrieveAndProcessIntent(sessionId, clientSecret);
        } catch (JSONException e) {
            Log.e(TAG, "Invalid session payload", e);
            activeSessionId = null;
            busy.set(false);
        }
    }

    private void retrieveAndProcessIntent(String sessionId, String clientSecret) {
        if (!Terminal.isInitialized()) {
            Log.w(TAG, "Terminal not initialized when attempting to collect");
            busy.set(false);
            return;
        }
        Terminal.getInstance().retrievePaymentIntent(clientSecret, new PaymentIntentCallback() {
            @Override
            public void onSuccess(@NonNull PaymentIntent paymentIntent) {
                collectPaymentMethod(sessionId, paymentIntent);
            }

            @Override
            public void onFailure(@NonNull TerminalException e) {
                handleFailure(sessionId, e.getErrorMessage());
            }
        });
    }

    private void collectPaymentMethod(String sessionId, PaymentIntent paymentIntent) {
        activeCollectCancelable = Terminal.getInstance().collectPaymentMethod(paymentIntent, new PaymentIntentCallback() {
            @Override
            public void onSuccess(@NonNull PaymentIntent intent) {
                processPayment(sessionId, intent);
            }

            @Override
            public void onFailure(@NonNull TerminalException e) {
                handleFailure(sessionId, e.getErrorMessage());
            }
        });
    }

    private void processPayment(String sessionId, PaymentIntent paymentIntent) {
        activeCollectCancelable = Terminal.getInstance().confirmPaymentIntent(paymentIntent, new PaymentIntentCallback() {
            @Override
            public void onSuccess(@NonNull PaymentIntent intent) {
                handleSuccess(sessionId, intent.getId());
            }

            @Override
            public void onFailure(@NonNull TerminalException e) {
                handleFailure(sessionId, e.getErrorMessage());
            }
        });
    }

    private void handleSuccess(String sessionId, String intentId) {
        activeSessionId = null;
        busy.set(false);
        try {
            JSONObject payload = new JSONObject();
            payload.put("status", "succeeded");
            payload.put("deviceId", deviceId);
            payload.put("intentId", intentId);
            patchSession(sessionId, payload);
            emitSessionEvent(sessionId, "succeeded", null, null, intentId);
        } catch (JSONException e) {
            Log.w(TAG, "Unable to serialize success payload", e);
        }
    }

    private void handleFailure(String sessionId, String message) {
        activeSessionId = null;
        busy.set(false);
        try {
            JSONObject payload = new JSONObject();
            payload.put("status", "failed");
            payload.put("deviceId", deviceId);
            payload.put("message", message);
            patchSession(sessionId, payload);
            emitSessionEvent(sessionId, "failed", message, null, null);
        } catch (JSONException e) {
            Log.w(TAG, "Unable to serialize failure payload", e);
        }
    }

    private void notifyProcessing(String sessionId) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("status", "processing");
            payload.put("deviceId", deviceId);
            patchSession(sessionId, payload);
            emitSessionEvent(sessionId, "processing", null, null, null);
        } catch (JSONException e) {
            Log.w(TAG, "Unable to serialize processing payload", e);
        }
    }

    private void patchSession(String sessionId, JSONObject payload) {
        scheduler.execute(() -> {
            try {
                String origin = activity.resolveCurrentOrigin();
                if (origin == null) {
                    return;
                }
                String cookieHeader = resolveCookieHeader(origin);
                if (cookieHeader == null) {
                    return;
                }
                String url = origin + "/api/payments/terminal/session/" + sessionId;
                Request request = new Request.Builder()
                        .url(url)
                        .patch(RequestBody.create(JSON, payload.toString()))
                        .addHeader("Cookie", cookieHeader)
                        .build();
                try (Response response = httpClient.newCall(request).execute()) {
                    if (!response.isSuccessful()) {
                        Log.w(TAG, "session patch failed: " + response.code());
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "patch error", e);
            }
        });
    }

    private void cancelDiscovery() {
        if (discoveryCancelable != null) {
            discoveryCancelable.cancel(createNoopCallback("discover-cancel"));
            discoveryCancelable = null;
        }
    }

    private void ensureTerminalInitialized() {
        if (Terminal.isInitialized()) {
            return;
        }
        try {
            Terminal.initTerminal(activity.getApplicationContext(), LogLevel.INFO, this, this);
        } catch (TerminalException e) {
            Log.e(TAG, "Unable to initialize Stripe Terminal", e);
        }
    }

    private void ensureReaderConnected() {
        mainHandler.post(this::ensureReaderConnectedOnMainThread);
    }

    private void ensureReaderConnectedOnMainThread() {
        if (!running.get() || !Terminal.isInitialized()) {
            return;
        }
        Reader connected = Terminal.getInstance().getConnectedReader();
        if (connected != null) {
            readerConnecting.set(false);
            emitReaderState("connected", connected.getLabel());
            return;
        }
        if (TextUtils.isEmpty(locationId)) {
            primeConnectionToken();
            emitReaderState("waiting", "Localisation Stripe manquante");
            return;
        }
        if (readerConnecting.getAndSet(true)) {
            return;
        }
        emitReaderState("disconnected", null);
        startReaderDiscovery();
    }

    private void primeConnectionToken() {
        if (primingToken.getAndSet(true)) {
            return;
        }
        scheduler.execute(() -> {
            try {
                TokenPayload payload = requestConnectionTokenPayload();
                cacheConnectionToken(payload);
            } catch (Exception e) {
                Log.e(TAG, "Unable to prime connection token", e);
            } finally {
                primingToken.set(false);
                if (!TextUtils.isEmpty(locationId)) {
                    ensureReaderConnected();
                } else {
                    mainHandler.postDelayed(this::ensureReaderConnectedOnMainThread, LOCATION_RETRY_MS);
                }
            }
        });
    }

    private void startReaderDiscovery() {
        cancelDiscovery();
        boolean isDebuggable = (activity.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        DiscoveryConfiguration.TapToPayDiscoveryConfiguration config =
                new DiscoveryConfiguration.TapToPayDiscoveryConfiguration(isDebuggable);
        emitReaderState(isDebuggable ? "simulated" : "discovering", null);
        discoveryCancelable = Terminal.getInstance().discoverReaders(
                config,
                readers -> {
                    synchronized (discoveredReaders) {
                        discoveredReaders.clear();
                        discoveredReaders.addAll(readers);
                    }
                },
                new Callback() {
                    @Override
                    public void onSuccess() {
                        Reader candidate = pickPreferredReader();
                        if (candidate == null) {
                            readerConnecting.set(false);
                            Log.w(TAG, "No Tap to Pay readers discovered on this device");
                            return;
                        }
                        connectDiscoveredReader(candidate);
                    }

                    @Override
                    public void onFailure(@NonNull TerminalException e) {
                        readerConnecting.set(false);
                        Log.e(TAG, "discoverReaders failed", e);
                        emitReaderState("error", e.getErrorMessage());
                    }
                }
        );
    }

    private Reader pickPreferredReader() {
        synchronized (discoveredReaders) {
            if (discoveredReaders.isEmpty()) {
                return null;
            }
            return discoveredReaders.get(0);
        }
    }

    private void connectDiscoveredReader(Reader reader) {
        cancelDiscovery();
        if (TextUtils.isEmpty(locationId)) {
            readerConnecting.set(false);
            primeConnectionToken();
            return;
        }
        emitReaderState("connecting", reader.getLabel());
        ConnectionConfiguration.TapToPayConnectionConfiguration config =
                new ConnectionConfiguration.TapToPayConnectionConfiguration(
                        locationId,
                        true,
                        tapToPayReaderListener
                );
        Terminal.getInstance().connectReader(reader, config, new ReaderCallback() {
            @Override
            public void onSuccess(@NonNull Reader reader) {
                readerConnecting.set(false);
                Log.i(TAG, "Connected to Tap to Pay reader: " + reader.getLabel());
                emitReaderState("connected", reader.getLabel());
            }

            @Override
            public void onFailure(@NonNull TerminalException e) {
                readerConnecting.set(false);
                Log.e(TAG, "connectReader failed", e);
                emitReaderState("error", e.getErrorMessage());
                ensureReaderConnected();
            }
        });
    }

    @Override
    public void fetchConnectionToken(ConnectionTokenCallback callback) {
        scheduler.execute(() -> {
            try {
                String cached = drainCachedConnectionToken();
                if (cached != null) {
                    callback.onSuccess(cached);
                    return;
                }
                TokenPayload payload = requestConnectionTokenPayload();
                cacheConnectionToken(payload);
                String token = drainCachedConnectionToken();
                if (token == null) {
                    callback.onFailure(new ConnectionTokenException("Token unavailable"));
                    return;
                }
                callback.onSuccess(token);
            } catch (Exception ex) {
                Log.e(TAG, "Token exception", ex);
                callback.onFailure(new ConnectionTokenException("Token exception"));
            }
        });
    }

    private void cacheConnectionToken(TokenPayload payload) {
        synchronized (tokenLock) {
            cachedConnectionToken = payload.secret;
            if (!TextUtils.isEmpty(payload.locationId)) {
                locationId = payload.locationId;
            } else if (locationId == null) {
                Log.w(TAG, "Tap to Pay location id missing from token response");
            }
        }
    }

    private String drainCachedConnectionToken() {
        synchronized (tokenLock) {
            String token = cachedConnectionToken;
            cachedConnectionToken = null;
            return token;
        }
    }

    private TokenPayload requestConnectionTokenPayload() throws Exception {
        String origin = activity.resolveCurrentOrigin();
        if (origin == null) {
            throw new ConnectionTokenException("Missing origin");
        }
        String cookieHeader = resolveCookieHeader(origin);
        if (cookieHeader == null) {
            throw new ConnectionTokenException("Missing auth cookie");
        }
        JSONObject body = new JSONObject();
        body.put("deviceId", deviceId);
        Request request = new Request.Builder()
                .url(origin + "/api/payments/terminal/token")
                .post(RequestBody.create(JSON, body.toString()))
                .addHeader("Cookie", cookieHeader)
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new ConnectionTokenException("Token request failed");
            }
            String raw = response.body().string();
            JSONObject payload = new JSONObject(raw);
            String secret = payload.optString("secret", null);
            if (secret == null) {
                throw new ConnectionTokenException("Token missing");
            }
            String location = payload.optString("locationId", null);
            return new TokenPayload(secret, location);
        }
    }

    private String resolveCookieHeader(String origin) {
        CookieManager cookieManager = CookieManager.getInstance();
        return cookieManager.getCookie(origin);
    }

    private static final class TokenPayload {
        final String secret;
        final String locationId;

        TokenPayload(String secret, String locationId) {
            this.secret = secret;
            this.locationId = locationId;
        }
    }

    private Callback createNoopCallback(final String label) {
        return new Callback() {
            @Override
            public void onSuccess() {
                Log.d(TAG, label + " cancel success");
            }

            @Override
            public void onFailure(@NonNull TerminalException e) {
                Log.w(TAG, label + " cancel failed", e);
            }
        };
    }

    private void emitReaderState(@NonNull String state, @Nullable String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("state", state);
            payload.put("timestamp", System.currentTimeMillis());
            if (message != null) {
                payload.put("message", message);
            }
            activity.emitTapToPayEvent("reader-status", payload);
        } catch (JSONException ignored) {
        }
    }

    private void emitSessionEvent(@NonNull String sessionId, @NonNull String status, @Nullable String message, @Nullable JSONObject context, @Nullable String intentId) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("sessionId", sessionId);
            payload.put("status", status);
            payload.put("timestamp", System.currentTimeMillis());
            if (message != null) {
                payload.put("message", message);
            }
            if (context != null) {
                if (context.has("amount")) {
                    payload.put("amount", context.optLong("amount"));
                }
                if (context.has("currency")) {
                    payload.put("currency", context.optString("currency"));
                }
            }
            if (intentId != null) {
                payload.put("intentId", intentId);
            }
            activity.emitTapToPayEvent("session", payload);
        } catch (JSONException ignored) {
        }
    }

    @SuppressLint("HardwareIds")
    private String buildDeviceId() {
        String androidId = Settings.Secure.getString(activity.getContentResolver(), Settings.Secure.ANDROID_ID);
        if (androidId == null) {
            androidId = "unknown";
        }
        return "tap2pay-" + androidId;
    }

    // TerminalListener implementation

    @Override
    public void onConnectionStatusChange(@NonNull ConnectionStatus status) {
        Log.d(TAG, "connection status: " + status.name());
        if (status == ConnectionStatus.NOT_CONNECTED) {
            ensureReaderConnected();
        }
    }

    @Override
    public void onPaymentStatusChange(@NonNull PaymentStatus status) {
        Log.d(TAG, "payment status: " + status.name());
    }

    public boolean hasActiveCollection() {
        return busy.get() || activeCollectCancelable != null || activeSessionId != null;
    }

}
