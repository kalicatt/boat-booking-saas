package com.sweetnarcisse.admin.models;

/**
 * Réponse de connexion (simplifié)
 */
public class LoginResponse {
    public boolean success;
    public String token;
    public User user;
    
    public static class User {
        public String id;
        public String email;
        public String firstName;
        public String lastName;
        public String role;
    }
}
