/**
 * OpenAPI 3.1 Specification for Sweet Narcisse API
 * Auto-generated documentation available at /api-docs
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Sweet Narcisse API',
    version: '1.0.5',
    description: 'API REST pour la réservation de barques électriques à Colmar',
    contact: {
      name: 'Sweet Narcisse',
      email: 'contact@sweet-narcisse.fr',
      url: 'https://sweet-narcisse.fr'
    },
    license: {
      name: 'Proprietary',
      url: 'https://sweet-narcisse.fr/legal'
    }
  },
  servers: [
    {
      url: 'https://sweet-narcisse.fr',
      description: 'Production'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development'
    }
  ],
  tags: [
    { name: 'Availability', description: 'Vérification des disponibilités' },
    { name: 'Bookings', description: 'Gestion des réservations' },
    { name: 'Payments', description: 'Paiements Stripe et PayPal' },
    { name: 'Contact', description: 'Formulaires de contact' },
    { name: 'Hours', description: 'Horaires d\'ouverture' },
    { name: 'Weather', description: 'Météo et conditions' },
    { name: 'Admin', description: 'Panel administrateur (authentification requise)' }
  ],
  paths: {
    '/api/availability': {
      get: {
        tags: ['Availability'],
        summary: 'Vérifier les disponibilités',
        description: 'Retourne les créneaux horaires disponibles pour une date et un nombre de personnes donnés. Cache Redis avec TTL de 60 secondes.',
        operationId: 'getAvailability',
        parameters: [
          {
            name: 'date',
            in: 'query',
            required: true,
            description: 'Date au format ISO (YYYY-MM-DD)',
            schema: { type: 'string', format: 'date', example: '2025-12-25' }
          },
          {
            name: 'adults',
            in: 'query',
            required: true,
            description: 'Nombre d\'adultes (max 8)',
            schema: { type: 'integer', minimum: 0, maximum: 8, example: 2 }
          },
          {
            name: 'children',
            in: 'query',
            required: true,
            description: 'Nombre d\'enfants',
            schema: { type: 'integer', minimum: 0, maximum: 8, example: 1 }
          },
          {
            name: 'babies',
            in: 'query',
            required: true,
            description: 'Nombre de bébés',
            schema: { type: 'integer', minimum: 0, maximum: 4, example: 0 }
          },
          {
            name: 'lang',
            in: 'query',
            required: true,
            description: 'Langue pour les messages d\'erreur',
            schema: { type: 'string', enum: ['fr', 'en', 'de', 'es', 'it'], example: 'fr' }
          }
        ],
        responses: {
          '200': {
            description: 'Disponibilités récupérées avec succès',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', format: 'date', example: '2025-12-25' },
                    availableSlots: {
                      type: 'array',
                      items: { type: 'string', example: '10:00' },
                      description: 'Créneaux disponibles au format HH:MM'
                    },
                    blockedReason: { type: 'string', nullable: true, example: 'Journée complète' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Paramètres manquants ou invalides',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Params manquants' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Erreur serveur',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Erreur serveur' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Créer une réservation',
        description: 'Crée une nouvelle réservation. Nécessite un paiement ou une confirmation admin. Rate limit: 20 requêtes/minute.',
        operationId: 'createBooking',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['date', 'startTime', 'adults', 'children', 'babies', 'firstName', 'lastName', 'email', 'phone', 'language'],
                properties: {
                  date: { type: 'string', format: 'date', example: '2025-12-25' },
                  startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '14:00' },
                  adults: { type: 'integer', minimum: 0, maximum: 8, example: 2 },
                  children: { type: 'integer', minimum: 0, maximum: 8, example: 1 },
                  babies: { type: 'integer', minimum: 0, maximum: 4, example: 0 },
                  firstName: { type: 'string', minLength: 1, maxLength: 100, example: 'Jean' },
                  lastName: { type: 'string', minLength: 1, maxLength: 100, example: 'Dupont' },
                  email: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
                  phone: { type: 'string', pattern: '^\\+?[0-9\\s\\-\\.\\(\\)]{8,20}$', example: '+33612345678' },
                  language: { type: 'string', enum: ['fr', 'en', 'de', 'es', 'it'], example: 'fr' },
                  paymentIntentId: { type: 'string', nullable: true, description: 'Stripe PaymentIntent ID' },
                  pendingOnly: { type: 'boolean', default: false, description: 'Créer en attente de paiement (admin uniquement)' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Réservation créée avec succès',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bookingId: { type: 'string', example: 'clx123abc456' },
                    publicReference: { type: 'string', example: 'SN-HI-2512-001' },
                    totalPrice: { type: 'number', example: 22 },
                    status: { type: 'string', enum: ['PENDING', 'CONFIRMED'], example: 'CONFIRMED' }
                  }
                }
              }
            }
          },
          '400': { description: 'Données invalides' },
          '409': { description: 'Créneau déjà réservé' },
          '429': { description: 'Trop de requêtes' },
          '500': { description: 'Erreur serveur' }
        }
      }
    },
    '/api/bookings/release': {
      post: {
        tags: ['Bookings'],
        summary: 'Annuler une réservation',
        description: 'Annule une réservation et libère le créneau. Invalide le cache.',
        operationId: 'cancelBooking',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bookingId', 'token'],
                properties: {
                  bookingId: { type: 'string', example: 'clx123abc456' },
                  token: { type: 'string', description: 'Token de sécurité reçu par email' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Réservation annulée',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true }
                  }
                }
              }
            }
          },
          '404': { description: 'Réservation non trouvée' },
          '403': { description: 'Token invalide' },
          '500': { description: 'Erreur serveur' }
        }
      }
    },
    '/api/contact': {
      post: {
        tags: ['Contact'],
        summary: 'Envoyer un message de contact général',
        description: 'Formulaire de contact général. Rate limit: 5 requêtes/heure.',
        operationId: 'sendContactMessage',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'message'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100, example: 'Jean Dupont' },
                  email: { type: 'string', format: 'email', example: 'jean@example.com' },
                  message: { type: 'string', minLength: 10, maxLength: 2000, example: 'Bonjour, je souhaiterais...' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Message envoyé avec succès',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true }
                  }
                }
              }
            }
          },
          '400': { description: 'Données invalides' },
          '429': { description: 'Trop de requêtes (max 5/heure)' },
          '500': { description: 'Erreur serveur' }
        }
      }
    },
    '/api/hours': {
      get: {
        tags: ['Hours'],
        summary: 'Récupérer les horaires d\'ouverture',
        description: 'Retourne les horaires d\'ouverture pour une date donnée. Cache 1 heure.',
        operationId: 'getHours',
        parameters: [
          {
            name: 'date',
            in: 'query',
            required: true,
            description: 'Date au format ISO (YYYY-MM-DD)',
            schema: { type: 'string', format: 'date', example: '2025-12-25' }
          }
        ],
        responses: {
          '200': {
            description: 'Horaires récupérés',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', example: '2025-12-25' },
                    open: { type: 'boolean', example: true },
                    openingTime: { type: 'string', nullable: true, example: '10:00' },
                    closingTime: { type: 'string', nullable: true, example: '18:00' },
                    closedReason: { type: 'string', nullable: true, example: 'Fermeture exceptionnelle' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/weather': {
      get: {
        tags: ['Weather'],
        summary: 'Récupérer la météo actuelle',
        description: 'Retourne la météo à Colmar (Open-Meteo API). Cache 10 minutes.',
        operationId: 'getWeather',
        responses: {
          '200': {
            description: 'Données météo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    temperature: { type: 'number', example: 18.5 },
                    weatherCode: { type: 'integer', example: 2 },
                    windSpeed: { type: 'number', example: 12.3 },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/payments/stripe/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Webhook Stripe',
        description: 'Endpoint pour les événements Stripe (payment_intent.succeeded, etc.). Vérifie la signature.',
        operationId: 'stripeWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Stripe Event Object'
              }
            }
          }
        },
        parameters: [
          {
            name: 'stripe-signature',
            in: 'header',
            required: true,
            description: 'Signature Stripe pour vérification',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Event traité' },
          '400': { description: 'Signature invalide' },
          '500': { description: 'Erreur serveur' }
        }
      }
    },
    '/api/admin/cache/metrics': {
      get: {
        tags: ['Admin'],
        summary: 'Statistiques cache Redis',
        description: 'Retourne les métriques de cache (hit rate, misses, errors). Authentification requise.',
        operationId: 'getCacheMetrics',
        security: [{ sessionAuth: [] }],
        responses: {
          '200': {
            description: 'Métriques cache',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    hits: { type: 'integer', example: 1542 },
                    misses: { type: 'integer', example: 284 },
                    errors: { type: 'integer', example: 2 },
                    hitRate: { type: 'string', example: '84.45%' },
                    total: { type: 'integer', example: 1826 },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          '401': { description: 'Non autorisé' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
        description: 'Session NextAuth (admin uniquement)'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string', nullable: true }
        }
      }
    }
  }
} as const
