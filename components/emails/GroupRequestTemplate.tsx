import * as React from 'react';

interface GroupRequestProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export const GroupRequestTemplate: React.FC<Readonly<GroupRequestProps>> = ({
  firstName, lastName, email, phone, message
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', lineHeight: '1.5' }}>
    <div style={{ backgroundColor: '#f59e0b', padding: '20px', textAlign: 'center' }}>
      <h2 style={{ color: 'black', margin: 0 }}>Nouvelle Demande de Groupe 👨‍👩‍👧‍👦</h2>
    </div>
    
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', border: '1px solid #ddd' }}>
      <p><strong>👤 Client :</strong> {firstName} {lastName}</p>
      <p><strong>📧 Email :</strong> <a href={`mailto:${email}`}>{email}</a></p>
      <p><strong>📞 Téléphone :</strong> <a href={`tel:${phone}`}>{phone}</a></p>
      
      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />
      
      <h3 style={{ color: '#0f172a' }}>Message / Besoins :</h3>
      <blockquote style={{ background: '#f9f9f9', padding: '15px', borderLeft: '4px solid #f59e0b', margin: 0 }}>
        {message}
      </blockquote>

      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />
      <p style={{ fontSize: '12px', color: '#888' }}>
        Cette demande provient du site Sweet Narcisse via le formulaire "Groupe (+12)".
      </p>
    </div>
  </div>
);