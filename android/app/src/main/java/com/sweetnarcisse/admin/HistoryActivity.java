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
                        JSONObject json = new JSONObject(responseBody);
                        JSONArray bookingsArray = json.getJSONArray("bookings");
                        
                        List<BookingHistory> newBookings = new ArrayList<>();
                        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH);
                        SimpleDateFormat timeFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.FRENCH);
                        SimpleDateFormat displayFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.FRENCH);
                        
                        for (int i = 0; i < bookingsArray.length(); i++) {
                            JSONObject booking = bookingsArray.getJSONObject(i);
                            
                            BookingHistory item = new BookingHistory();
                            item.id = booking.getString("id");
                            item.reference = booking.getString("publicReference");
                            item.customerName = booking.getString("customerName");
                            item.customerEmail = booking.getString("customerEmail");
                            item.boat = booking.getString("boat");
                            item.slot = booking.getString("slot");
                            item.checkinStatus = booking.getString("checkinStatus");
                            item.paymentStatus = booking.getString("paymentStatus");
                            item.totalPrice = booking.getDouble("totalPrice");
                            
                            // Parse dates
                            String dateStr = booking.getString("date");
                            String checkinAtStr = booking.optString("checkinAt", null);
                            
                            try {
                                Date date = dateFormat.parse(dateStr);
                                item.date = displayFormat.format(date);
                            } catch (ParseException e) {
                                item.date = dateStr;
                            }
                            
                            if (checkinAtStr != null && !checkinAtStr.equals("null")) {
                                try {
                                    // Format ISO avec timezone: enlever le Z et millisecondes
                                    String cleanDate = checkinAtStr.substring(0, 19);
                                    Date checkinDate = timeFormat.parse(cleanDate);
                                    item.checkinAt = displayFormat.format(checkinDate);
                                } catch (Exception e) {
                                    item.checkinAt = checkinAtStr;
                                }
                            }
                            
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
                        Log.e(TAG, "Erreur parsing historique", e);
                        runOnUiThread(() -> {
                            swipeRefresh.setRefreshing(false);
                            Toast.makeText(HistoryActivity.this, 
                                "Erreur de traitement", 
                                Toast.LENGTH_SHORT).show();
                        });
                    }
                } else {
                    Log.w(TAG, "Réponse historique non-200: " + response.code());
                    runOnUiThread(() -> {
                        swipeRefresh.setRefreshing(false);
                    });
                }
            }
        });
    }
}
