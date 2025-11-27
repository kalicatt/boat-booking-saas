import * as React from 'react';

interface BookingEmailProps {
  firstName: string;
  date: string;
  time: string;
  people: number;
  adults: number;
  children: number;
  babies: number;
  bookingId: string;
  totalPrice: number;
}

const PRICE_ADULT = 9.00;
const PRICE_CHILD = 4.00;

export const BookingTemplate: React.FC<Readonly<BookingEmailProps>> = ({
  firstName, date, time, people, adults, children, babies, bookingId, totalPrice
}) => {
  
  const mapLink = "https://maps.app.goo.gl/v2S3t2Wq83B7k6996"; // Lien vers Pont-Saint Pierre

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', maxWidth: '600px', margin: '0 auto', border: '1px solid #ddd', borderRadius: '8px' }}>
      
      {/* HEADER */}
      <div style={{ backgroundColor: '#0f172a', padding: '20px', textAlign: 'center', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <h1 style={{ color: '#eab308', margin: 0, fontSize: '24px' }}>Sweet Narcisse</h1>
        <p style={{ color: 'white', margin: '5px 0 0', fontSize: '14px' }}>Confirmation de votre réservation</p>
      </div>

      <div style={{ padding: '20px' }}>
        <h2>Bonjour {firstName},</h2>
        <p>Merci pour votre réservation. Votre tour en barque est confirmé !</p>
        
        {/* BLOC RÉSUMÉ */}
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
          <p style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 'bold' }}>Récapitulatif :</p>
          <p style={{ margin: 0 }}>📅 Date : <strong style={{ color: '#0f172a' }}>{date}</strong></p>
          <p style={{ margin: 0 }}>⏰ Heure : <strong style={{ color: '#0f172a' }}>{time}</strong></p>
          <p style={{ margin: 0 }}>👥 Total Passagers : <strong>{people}</strong></p>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Réf. Réservation : {bookingId}</p>
        </div>

        {/* FACTURE / DÉTAIL DES PRIX */}
        <h3 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', margin: '30px 0 15px' }}>
            Détail de la facture
        </h3>
        <table width="100%" cellPadding="5" cellSpacing="0" style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f1f1f1' }}>
                <tr>
                    <th style={{ textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                    <th style={{ border: '1px solid #ddd' }}>Prix Unitaire</th>
                    <th style={{ border: '1px solid #ddd' }}>Qté</th>
                    <th style={{ textAlign: 'right', border: '1px solid #ddd' }}>Total</th>
                </tr>
            </thead>
            <tbody>
                {adults > 0 && (
                    <tr>
                        <td style={{ textAlign: 'left', border: '1px solid #ddd' }}>Adultes</td>
                        <td style={{ textAlign: 'center', border: '1px solid #ddd' }}>{PRICE_ADULT.toFixed(2)} €</td>
                        <td style={{ textAlign: 'center', border: '1px solid #ddd' }}>{adults}</td>
                        <td style={{ textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold' }}>{(adults * PRICE_ADULT).toFixed(2)} €</td>
                    </tr>
                )}
                {children > 0 && (
                    <tr>
                        <td style={{ textAlign: 'left', border: '1px solid #ddd' }}>Enfants (4-10 ans)</td>
                        <td style={{ textAlign: 'center', border: '1px solid #ddd' }}>{PRICE_CHILD.toFixed(2)} €</td>
                        <td style={{ textAlign: 'center', border: '1px solid #ddd' }}>{children}</td>
                        <td style={{ textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold' }}>{(children * PRICE_CHILD).toFixed(2)} €</td>
                    </tr>
                )}
                {babies > 0 && (
                    <tr>
                        <td style={{ textAlign: 'left', border: '1px solid #ddd' }}>Bébés (0-3 ans)</td>
                        <td style={{ textAlign: 'center', border: '1px solid #ddd' }}>0,00 €</td>
                        <td style={{ textAlign: 'center', border: '1px solid #ddd' }}>{babies}</td>
                        <td style={{ textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold' }}>0,00 €</td>
                    </tr>
                )}
                <tr style={{ backgroundColor: '#fffbe6' }}>
                    <td colSpan={3} style={{ textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold' }}>TOTAL À RÉGLER :</td>
                    <td style={{ textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>{totalPrice.toFixed(2)} €</td>
                </tr>
            </tbody>
        </table>
        
        {/* PLAN D'ACCÈS */}
        <h3 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', margin: '30px 0 15px' }}>
            Où nous trouver ?
        </h3>
        <p style={{ margin: '10px 0' }}>
            L'embarcadère se situe au **Pont-Saint Pierre, 10 Rue de la Herse, 68000 Colmar**.
        </p>
        <div style={{ textAlign: 'center' }}>
            <a href={mapLink} style={{ 
                display: 'inline-block', 
                backgroundColor: '#eab308', 
                color: '#0f172a', 
                padding: '10px 20px', 
                borderRadius: '5px', 
                textDecoration: 'none', 
                fontWeight: 'bold' 
            }}>
                Ouvrir la carte Google Maps 🗺️
            </a>
        </div>


        <hr style={{ borderColor: '#ddd', margin: '30px 0' }} />
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', lineHeight: 1.5 }}>
                    <p style={{ margin: '0 0 6px' }}>Politique d’annulation (rappel) : &gt;48h : 100% • 48–24h : 50% • &lt;24h / no‑show : 0%.</p>
                    <p style={{ margin: '0 0 6px' }}>Météo sévère (alerte orange/rouge) : remboursement intégral.</p>
                    <p style={{ margin: 0 }}>Merci de vous présenter 10 minutes avant le départ. Sweet Narcisse – À bientôt !</p>
                </div>
      </div>
    </div>
  )
};