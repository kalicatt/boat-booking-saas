package com.sweetnarcisse.admin;

import android.Manifest;
import android.content.ComponentCallbacks2;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.sweetnarcisse.admin.overlays.ScannerOverlayView;
import com.sweetnarcisse.admin.tap2pay.TapToPayManager;
import org.json.JSONObject;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class MainActivity extends BridgeActivity {

	private ScannerOverlayView scannerOverlayView;
	private boolean scannerInterfaceRegistered = false;
	private TapToPayManager tapToPayManager;
	private static final int TAP_TO_PAY_PERMISSION_REQUEST = 501;
	private static final String TAP_TO_PAY_LOG_TAG = "TapToPayManager";
	private static final long TAP_TO_PAY_CANCEL_DELAY_MS = 1500L;

	private final Handler lifecycleHandler = new Handler(Looper.getMainLooper());
	@Nullable
	private Runnable pendingLifecycleCancel;

	@Override
	protected void onCreate(@Nullable Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		scannerOverlayView = findViewById(R.id.scanner_overlay);
		if (scannerOverlayView != null) {
			scannerOverlayView.setVisibility(View.GONE);
		}
		tapToPayManager = new TapToPayManager(this);
	}

	@Override
	public void onStart() {
		super.onStart();
		registerScannerListener();
		if (tapToPayManager != null) {
			if (ensureTapToPayPermissions()) {
				tapToPayManager.start();
			}
		}
	}

	@Override
	public void onPause() {
		super.onPause();
		logTapToPayLifecycle("onPause", null);
		scheduleLifecycleCancel("activity-paused", TAP_TO_PAY_CANCEL_DELAY_MS);
	}

	@Override
	public void onResume() {
		super.onResume();
		logTapToPayLifecycle("onResume", null);
		clearPendingLifecycleCancel("activity-resumed");
	}

	@Override
	public void onTrimMemory(int level) {
		super.onTrimMemory(level);
		logTapToPayLifecycle("onTrimMemory", "level=" + level);
		if (level >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND) {
			clearPendingLifecycleCancel(null);
			cancelTapToPayFlow("trim-memory-" + level);
		}
	}

	@Override
	public void onStop() {
		logTapToPayLifecycle("onStop", null);
		super.onStop();
		clearPendingLifecycleCancel(null);
		unregisterScannerListener();
		if (tapToPayManager != null) {
			if (tapToPayManager.hasActiveCollection()) {
				logTapToPayLifecycle("onStop-skipped", "active collection in progress");
			} else {
				tapToPayManager.stop();
			}
		}
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
		super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		if (requestCode == TAP_TO_PAY_PERMISSION_REQUEST) {
			boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
			if (granted && tapToPayManager != null) {
				tapToPayManager.start();
			}
		}
	}

	private boolean ensureTapToPayPermissions() {
		if (hasTapToPayPermissions()) {
			return true;
		}
		ActivityCompat.requestPermissions(
			this,
			new String[] { Manifest.permission.ACCESS_FINE_LOCATION },
			TAP_TO_PAY_PERMISSION_REQUEST
		);
		return false;
	}

	private boolean hasTapToPayPermissions() {
		return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
	}

	@Override
	public void onDestroy() {
		if (tapToPayManager != null) {
			tapToPayManager.destroy();
		}
		super.onDestroy();
	}

	private void logTapToPayLifecycle(@NonNull String event, @Nullable String details) {
		StringBuilder message = new StringBuilder("MainActivity lifecycle ").append(event);
		if (details != null && !details.isEmpty()) {
			message.append(" ").append(details);
		}
		Log.d(TAP_TO_PAY_LOG_TAG, message.toString());
	}

	private void cancelTapToPayFlow(@NonNull String reason) {
		if (tapToPayManager == null) {
			return;
		}
		tapToPayManager.cancelActivePaymentFlow(reason);
	}

	private void scheduleLifecycleCancel(@NonNull String reason, long delayMs) {
		clearPendingLifecycleCancel(null);
		pendingLifecycleCancel = () -> {
			logTapToPayLifecycle("lifecycle-cancel", reason);
			cancelTapToPayFlow(reason);
		};
		lifecycleHandler.postDelayed(pendingLifecycleCancel, delayMs);
	}

	private void clearPendingLifecycleCancel(@Nullable String source) {
		if (pendingLifecycleCancel == null) {
			return;
		}
		lifecycleHandler.removeCallbacks(pendingLifecycleCancel);
		pendingLifecycleCancel = null;
		if (source != null) {
			logTapToPayLifecycle("lifecycle-cancel-cleared", source);
		}
	}

	private void registerScannerListener() {
		if (bridge == null || bridge.getWebView() == null || scannerInterfaceRegistered) {
			return;
		}

		WebView webView = bridge.getWebView();
		webView.addJavascriptInterface(new ScannerOverlayBridge(webView), "ScannerOverlay");
		scannerInterfaceRegistered = true;
	}

	public String resolveCurrentOrigin() {
		if (Looper.myLooper() == Looper.getMainLooper()) {
			return resolveCurrentOriginInternal();
		}

		// Marshal WebView access onto the UI thread so background TapToPay tasks stay safe.
		FutureTask<String> originTask = new FutureTask<>(this::resolveCurrentOriginInternal);
		runOnUiThread(originTask);
		try {
			return originTask.get(2, TimeUnit.SECONDS);
		} catch (InterruptedException | ExecutionException | TimeoutException ignored) {
			return null;
		}
	}

	@Nullable
	private String resolveCurrentOriginInternal() {
		if (bridge != null && bridge.getWebView() != null) {
			String current = bridge.getWebView().getUrl();
			if (current != null && current.startsWith("http")) {
				Uri uri = Uri.parse(current);
				StringBuilder origin = new StringBuilder();
				origin.append(uri.getScheme()).append("://").append(uri.getHost());
				if (uri.getPort() > 0 && uri.getPort() != 80 && uri.getPort() != 443) {
					origin.append(":" + uri.getPort());
				}
				return origin.toString();
			}
		}
		return null;
	}

	public void emitTapToPayEvent(@Nullable String type, @Nullable JSONObject payload) {
		if (type == null || type.isEmpty()) {
			return;
		}
		if (bridge == null || bridge.getWebView() == null) {
			return;
		}
		String detail = payload != null ? payload.toString() : "{}";
		String sanitizedType = type.replace("'", "");
		String script = "window.dispatchEvent(new CustomEvent('tap2pay:" + sanitizedType + "', { detail: " + detail + " }));";
		runOnUiThread(() -> bridge.getWebView().evaluateJavascript(script, null));
	}

	private void unregisterScannerListener() {
		if (scannerOverlayView != null) {
			scannerOverlayView.setVisibility(View.GONE);
		}
		if (bridge != null && bridge.getWebView() != null) {
			bridge.getWebView().setAlpha(1f);
			bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
		}
	}

	private final class ScannerOverlayBridge {
		@Nullable
		private final WebView webView;

		ScannerOverlayBridge(@Nullable WebView webView) {
			this.webView = webView;
		}

		@JavascriptInterface
		public void showOverlay() {
			runOnUiThread(
				() -> {
					if (scannerOverlayView != null) {
						scannerOverlayView.setVisibility(View.VISIBLE);
					}
				}
			);
		}

		@JavascriptInterface
		public void hideOverlay() {
			runOnUiThread(
				() -> {
					if (scannerOverlayView != null) {
						scannerOverlayView.setVisibility(View.GONE);
					}
				}
			);
		}

		@JavascriptInterface
		public void hideWebView() {
			runOnUiThread(
				() -> {
					if (webView != null) {
						webView.setAlpha(0f);
						webView.setBackgroundColor(Color.TRANSPARENT);
					}
				}
			);
		}

		@JavascriptInterface
		public void showWebView() {
			runOnUiThread(
				() -> {
					if (webView != null) {
						webView.setAlpha(1f);
						webView.setBackgroundColor(Color.TRANSPARENT);
					}
				}
			);
		}
	}
}
