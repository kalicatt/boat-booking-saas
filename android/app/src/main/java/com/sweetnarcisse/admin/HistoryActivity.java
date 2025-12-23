package com.sweetnarcisse.admin;

import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.sweetnarcisse.admin.adapters.BookingHistoryAdapter;
import com.sweetnarcisse.admin.api.StatsService;
import com.sweetnarcisse.admin.models.BookingHistory;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Activité affichant l'historique des réservations
 */
public class HistoryActivity extends AppCompatActivity {
    
    private static final String TAG = "HistoryActivity";
    
    private SwipeRefreshLayout swipeRefresh;
    private RecyclerView recyclerView;
    private TextView emptyText;
    
    private StatsService statsService;
    private BookingHistoryAdapter adapter;
    private List<BookingHistory> bookings;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_history);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Historique");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // Initialiser les services
        statsService = new StatsService();
        bookings = new ArrayList<>();
        
        // Bind views
        swipeRefresh = findViewById(R.id.swipeRefresh);
        recyclerView = findViewById(R.id.historyRecyclerView);
        emptyText = findViewById(R.id.emptyText);
        
        // Setup RecyclerView
        adapter = new BookingHistoryAdapter(bookings);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);
        
        // Setup swipe refresh
        swipeRefresh.setOnRefreshListener(this::loadHistory);
        
        // Charger l'historique
        loadHistory();
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
    
    private void loadHistory() {
        swipeRefresh.setRefreshing(true);
        
        statsService.getHistory(50, 0, new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Erreur lors du chargement de l'historique", e);
                runOnUiThread(() -> {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(HistoryActivity.this, 
                        "Erreur de chargement", 
                        Toast.LENGTH_SHORT).show();
                });
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful() && response.body() != null) {
                    try {
                        String responseBody = response.body().string();
                        Log.d(TAG, "Response: " + responseBody.substring(0, Math.min(500, responseBody.length())));
                        
                        JSONObject json = new JSONObject(responseBody);
                        JSONArray bookingsArray = json.getJSONArray("bookings");
                        
                        List<BookingHistory> newBookings = new ArrayList<>();
                        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH);
                        SimpleDateFormat displayDateFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.FRENCH);
                        
                        for (int i = 0; i < bookingsArray.length(); i++) {
                            JSONObject booking = bookingsArray.getJSONObject(i);
                            
                            BookingHistory item = new BookingHistory();
                            item.id = booking.optString("id", "");
                            item.reference = booking.optString("publicReference", "N/A");
                            item.customerName = booking.optString("customerName", "Inconnu");
                            item.customerEmail = booking.optString("customerEmail", "");
                            item.boat = booking.optString("boat", "Non assigné");
                            item.slot = booking.optString("slot", "");
                            item.checkinStatus = booking.optString("checkinStatus", "PENDING");
                            
                            // L'API retourne isPaid (boolean) au lieu de paymentStatus
                            boolean isPaid = booking.optBoolean("isPaid", false);
                            item.paymentStatus = isPaid ? "PAID" : "PENDING";
                            
                            item.totalPrice = booking.optDouble("totalPrice", 0);
                            
                            // Parse date
                            String dateStr = booking.optString("date", "");
                            if (!dateStr.isEmpty()) {
                                try {
                                    Date date = dateFormat.parse(dateStr);
                                    item.date = displayDateFormat.format(date);
                                } catch (ParseException e) {
                                    item.date = dateStr;
                                }
                            } else {
                                item.date = "N/A";
                            }
                            
                            // checkinAt n'est pas retourné par l'API actuelle
                            item.checkinAt = null;
                            item.paymentMethod = booking.optString("paymentMethod", null);
                            
                            newBookings.add(item);
                        }
                        
                        runOnUiThread(() -> {
                            bookings.clear();
                            bookings.addAll(newBookings);
                            adapter.notifyDataSetChanged();
                            
                            emptyText.setVisibility(bookings.isEmpty() ? View.VISIBLE : View.GONE);
                            recyclerView.setVisibility(bookings.isEmpty() ? View.GONE : View.VISIBLE);
                            
                            swipeRefresh.setRefreshing(false);
                            
                            Log.d(TAG, "Historique chargé: " + bookings.size() + " réservations");
                        });
                        
                    } catch (Exception e) {
                        Log.e(TAG, "Erreur parsing historique: " + e.getMessage(), e);
                        runOnUiThread(() -> {
                            swipeRefresh.setRefreshing(false);
                            Toast.makeText(HistoryActivity.this, 
                                "Erreur: " + e.getMessage(), 
                                Toast.LENGTH_LONG).show();
                        });
                    }
                } else {
                    String errorBody = response.body() != null ? response.body().string() : "No body";
                    Log.w(TAG, "Réponse historique non-200: " + response.code() + " - " + errorBody);
                    runOnUiThread(() -> {
                        swipeRefresh.setRefreshing(false);
                        Toast.makeText(HistoryActivity.this,
                            "Erreur serveur: " + response.code(),
                            Toast.LENGTH_SHORT).show();
                    });
                }
            }
        });
    }
}
