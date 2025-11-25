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
        <h1 style={{ color: '#eab308', margin: 0, fontSize: '20px' }}>Sweet Narcisse</h1>
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
  </div>
);