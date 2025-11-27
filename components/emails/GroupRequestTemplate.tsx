import * as React from 'react';

interface GroupRequestProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  people: number; // Ajout du champ manquant
}

export const GroupRequestTemplate: React.FC<Readonly<GroupRequestProps>> = ({
  firstName,
  lastName,
  email,
  phone,
  message,
  people,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', maxWidth: '600px', margin: '0 auto', border: '1px solid #ddd', borderRadius: '8px' }}>
    
    {/* Header */}
    <div style={{ backgroundColor: '#0f172a', padding: '20px', textAlign: 'center', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        {/* Compute base URL for absolute image rendering in emails */}
        {(() => {
          const base = (process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '')
          const src = base ? `${base}/images/logo.jpg` : ''
          return src ? <img src={src} alt="Sweet Narcisse" width={140} height={42} style={{ display:'block', margin:'0 auto 6px', maxWidth:'100%' }} /> : <h1 style={{ color: '#eab308', margin: 0, fontSize: '20px' }}>Sweet Narcisse</h1>
        })()}
        <p style={{ color: 'white', margin: '5px 0 0', fontSize: '14px' }}>Nouvelle demande reçue</p>
    </div>

    <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#0f172a' }}>Demande de Groupe / Privatisations</h2>
        <p>Une nouvelle demande a été effectuée depuis le site web.</p>

        <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <p style={{ margin: '5px 0' }}><strong>👤 Client :</strong> {firstName} {lastName}</p>
            <p style={{ margin: '5px 0' }}><strong>📧 Email :</strong> <a href={`mailto:${email}`} style={{ color: '#2563eb' }}>{email}</a></p>
            <p style={{ margin: '5px 0' }}><strong>📞 Téléphone :</strong> <a href={`tel:${phone}`} style={{ color: '#2563eb' }}>{phone}</a></p>
            <p style={{ margin: '5px 0' }}><strong>👥 Groupe :</strong> {people} personnes</p>
        </div>

        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Message du client :</h3>
        <p style={{ whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '15px', border: '1px solid #eee', borderRadius: '5px', fontStyle: 'italic' }}>
            "{message}"
        </p>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a href={`mailto:${email}?subject=Réponse à votre demande Sweet Narcisse`} 
               style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 24px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Répondre par email
            </a>
        </div>
    </div>
    {/* Footer with logo + address + socials */}
    {(() => {
      const base = (process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '')
      const src = base ? `${base}/images/logo.jpg` : ''
      return (
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '24px', paddingTop: '16px', textAlign:'center' }}>
          {src && <img src={src} alt="Sweet Narcisse" width={110} height={34} style={{ display:'block', margin:'0 auto 8px', opacity:0.9 }} />}
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Pont Saint‑Pierre, 68000 Colmar · +33 3 89 20 68 92 · contact@sweet-narcisse.fr
          </div>
          <div style={{ marginTop: '6px' }}>
            <a href="https://www.instagram.com/" style={{ fontSize:12, color:'#2563eb', marginRight:12 }}>Instagram</a>
            <a href="https://www.facebook.com/" style={{ fontSize:12, color:'#2563eb', marginRight:12 }}>Facebook</a>
            <a href="https://sweet-narcisse.fr/" style={{ fontSize:12, color:'#2563eb' }}>Site web</a>
          </div>
        </div>
      )
    })()}
  </div>
);