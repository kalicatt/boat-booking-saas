package com.sweetnarcisse.admin;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.util.Size;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.Task;
import com.google.android.material.button.MaterialButton;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.sweetnarcisse.admin.api.ApiClient;
import com.sweetnarcisse.admin.api.BookingService;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

import java.io.IOException;
import java.net.URLDecoder;

/**
 * Activité de scan de QR Code pour check-in
 * Utilise CameraX + ML Kit
 */
public class ScannerActivity extends AppCompatActivity {
    
    private static final String TAG = "ScannerActivity";
    private static final int CAMERA_PERMISSION_REQUEST = 100;
    
    private PreviewView previewView;
    private MaterialButton cancelButton;
    
    private ExecutorService cameraExecutor;
    private BarcodeScanner barcodeScanner;
    private BookingService bookingService;
    
    private boolean isProcessing = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scanner);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Scanner QR Code");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // Bind views
        previewView = findViewById(R.id.previewView);
        cancelButton = findViewById(R.id.cancelButton);
        
        // Setup scanner
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build();
        barcodeScanner = BarcodeScanning.getClient(options);
        
        // Setup API service
        bookingService = new BookingService(ApiClient.getInstance());
        
        // Setup buttons
        cancelButton.setOnClickListener(v -> finish());
        
        // Setup camera executor
        cameraExecutor = Executors.newSingleThreadExecutor();
        
        // Check camera permission
        if (hasCameraPermission()) {
            startCamera();
        } else {
            requestCameraPermission();
        }
    }
    
    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
    }
    
    private void requestCameraPermission() {
        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA},
            CAMERA_PERMISSION_REQUEST);
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                          @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "Permission caméra requise", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }
    
    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
            ProcessCameraProvider.getInstance(this);
        
        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                bindCamera(cameraProvider);
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Erreur lors de l'initialisation de la caméra", e);
            }
        }, ContextCompat.getMainExecutor(this));
    }
    
    private void bindCamera(ProcessCameraProvider cameraProvider) {
        // Preview
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        
        // Image analysis pour le scan QR
        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
            .setTargetResolution(new Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build();
        
        imageAnalysis.setAnalyzer(cameraExecutor, imageProxy -> {
            if (!isProcessing) {
                @androidx.camera.core.ExperimentalGetImage
                android.media.Image mediaImage = imageProxy.getImage();
                
                if (mediaImage != null) {
                    InputImage image = InputImage.fromMediaImage(mediaImage,
                        imageProxy.getImageInfo().getRotationDegrees());
                    
                    processImage(image, imageProxy);
                } else {
                    imageProxy.close();
                }
            } else {
                imageProxy.close();
            }
        });
        
        // Camera selector (back camera)
        CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;
        
        try {
            // Unbind all before rebinding
            cameraProvider.unbindAll();
            
            // Bind use cases to camera
            Camera camera = cameraProvider.bindToLifecycle(
                this, cameraSelector, preview, imageAnalysis);
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du binding de la caméra", e);
        }
    }
    
    private void processImage(InputImage image, androidx.camera.core.ImageProxy imageProxy) {
        Task<List<Barcode>> result = barcodeScanner.process(image);
        
        result.addOnSuccessListener(barcodes -> {
            for (Barcode barcode : barcodes) {
                if (barcode.getFormat() == Barcode.FORMAT_QR_CODE) {
                    String rawValue = barcode.getRawValue();
                    if (rawValue != null && !isProcessing) {
                        handleQrCode(rawValue);
                    }
                }
            }
            imageProxy.close();
        }).addOnFailureListener(e -> {
            Log.e(TAG, "Erreur lors du scan", e);
            imageProxy.close();
        });
    }
    
    private void handleQrCode(String qrData) {
        isProcessing = true;
        
        Log.d(TAG, "QR Code détecté: " + qrData);
        
        try {
            // Parser le JSON du QR code
            // Format attendu: {"type":"booking","bookingId":"...","reference":"..."}
            
            org.json.JSONObject json = new org.json.JSONObject(qrData);
            
            if (!"booking".equals(json.optString("type"))) {
                runOnUiThread(() -> {
                    Toast.makeText(this, "QR Code invalide (type incorrect)", Toast.LENGTH_SHORT).show();
                    isProcessing = false;
                });
                return;
            }
            
            String bookingId = json.optString("bookingId");
            if (bookingId == null || bookingId.isEmpty()) {
                throw new IllegalArgumentException("bookingId manquant");
            }
            
            // Générer le token HMAC-SHA256 (16 premiers caractères)
            String token = computeBookingToken(bookingId);
            
            Log.d(TAG, "bookingId: " + bookingId + ", token généré: " + token);
            
            // Appel API pour vérifier et check-in
            verifyAndCheckin(bookingId, token);
            
        } catch (org.json.JSONException e) {
            Log.e(TAG, "Erreur lors du parsing JSON du QR", e);
            runOnUiThread(() -> {
                Toast.makeText(this, "QR Code invalide (format JSON incorrect)", Toast.LENGTH_SHORT).show();
                isProcessing = false;
            });
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du traitement du QR", e);
            runOnUiThread(() -> {
                Toast.makeText(this, "QR Code invalide", Toast.LENGTH_SHORT).show();
                isProcessing = false;
            });
        }
    }
    
    /**
     * Génère le token HMAC-SHA256 pour un bookingId
     * Correspond à computeBookingToken() du backend
     */
    private String computeBookingToken(String bookingId) {
        try {
            // Secret identique au backend (NEXTAUTH_SECRET)
            String secret = "d6b59510793ddd090fd4907da4cc25a0f6ef7014c09769ca1f7f3a121869b73b";
            
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(
                secret.getBytes("UTF-8"), "HmacSHA256");
            mac.init(secretKey);
            
            byte[] hmacBytes = mac.doFinal(bookingId.getBytes("UTF-8"));
            
            // Convertir en hex et prendre les 16 premiers caractères
            StringBuilder hexString = new StringBuilder();
            for (byte b : hmacBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            
            return hexString.substring(0, 16);
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur génération token", e);
            return "";
        }
    }
    
    private void verifyAndCheckin(String bookingId, String token) {
        bookingService.verifyAndCheckin(bookingId, token, true, new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Erreur réseau lors de la vérification", e);
                runOnUiThread(() -> {
                    Toast.makeText(ScannerActivity.this,
                        "Erreur réseau", Toast.LENGTH_SHORT).show();
                    isProcessing = false;
                });
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String body = response.body().string();
                
                if (response.isSuccessful()) {
                    // Parse la réponse et afficher confirmation
                    runOnUiThread(() -> {
                        Intent intent = new Intent(ScannerActivity.this,
                            CheckinConfirmationActivity.class);
                        intent.putExtra("response", body);
                        startActivity(intent);
                        finish();
                    });
                } else {
                    runOnUiThread(() -> {
                        String message;
                        if (response.code() == 404) {
                            message = "Réservation introuvable";
                        } else if (response.code() == 400) {
                            message = "QR Code invalide ou expiré";
                        } else {
                            message = "Erreur: " + response.code();
                        }
                        
                        Toast.makeText(ScannerActivity.this, message,
                            Toast.LENGTH_LONG).show();
                        isProcessing = false;
                    });
                }
            }
        });
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        cameraExecutor.shutdown();
        barcodeScanner.close();
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
