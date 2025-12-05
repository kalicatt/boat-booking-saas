/* eslint-disable @next/next/no-img-element */
import * as React from 'react';

interface BookingEmailProps {
    firstName: string
    date: string
    time: string
    people: number
    adults: number
    childrenCount: number
    babies: number
    bookingId: string
    publicReference?: string | null
    totalPrice: number
    qrCodeUrl?: string | null
    qrCodeDataUrl?: string | null
    qrCodeCid?: string | null
    cancelUrl: string
    logoUrl?: string | null
    logoCid?: string | null
    reviewUrl?: string | null
}

const brand = {
    night: '#0f172a',
    gold: '#f59e0b',
    muted: '#64748b',
    surface: '#f8fafc'
}

const mapLink = 'https://maps.app.goo.gl/v2S3t2Wq83B7k6996'
const runtimeBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '')
const defaultLogoUrl = runtimeBaseUrl ? `${runtimeBaseUrl}/images/logo.jpg` : undefined

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export const BookingTemplate: React.FC<Readonly<BookingEmailProps>> = ({
    firstName,
    date,
    time,
    people,
    adults,
    childrenCount,
    babies,
    bookingId,
    publicReference,
    totalPrice,
    qrCodeUrl,
    qrCodeDataUrl,
    qrCodeCid,
    cancelUrl,
    logoUrl,
    logoCid,
    reviewUrl
}) => {
    const referenceLabel = publicReference || bookingId
    const qrSrc = (qrCodeCid ? `cid:${qrCodeCid}` : (qrCodeDataUrl || qrCodeUrl || ''))
    const resolvedLogoSrc = logoCid ? `cid:${logoCid}` : (logoUrl || defaultLogoUrl)
    const ageBreakdownParts: string[] = []
    const reviewLink = reviewUrl || null

    if (adults > 0) {
        ageBreakdownParts.push(`${adults} adulte${adults > 1 ? 's' : ''}`)
    }
    if (childrenCount > 0) {
        ageBreakdownParts.push(`${childrenCount} enfant${childrenCount > 1 ? 's' : ''}`)
    }
    if (babies > 0) {
        ageBreakdownParts.push(`${babies} bébé${babies > 1 ? 's' : ''}`)
    }

    const ageBreakdown = ageBreakdownParts.join(' · ')

    return (
        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: '#e2e8f0', padding: '24px 0' }}>
            <tbody>
                <tr>
                    <td align="center">
                        <table width="600" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: '#ffffff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 48px rgba(15,23,42,0.12)', fontFamily: 'Arial, Helvetica, sans-serif', color: brand.night }}>
                            <tbody>
                                <tr>
                                    <td style={{ background: brand.night, padding: '32px 24px', textAlign: 'center' }}>
                                        {resolvedLogoSrc ? (
                                            <img src={resolvedLogoSrc} alt="Sweet Narcisse" width={160} height={48} style={{ display: 'block', margin: '0 auto 12px' }} />
                                        ) : (
                                            <span style={{ display: 'block', fontSize: 28, fontWeight: 700, color: brand.gold }}>Sweet Narcisse</span>
                                        )}
                                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: 16, letterSpacing: 0.4 }}>Confirmation de votre balade</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '32px 32px 16px' }}>
                                        <p style={{ margin: '0 0 16px', fontSize: 18 }}>Bonjour {firstName},</p>
                                        <p style={{ margin: '0 0 24px', fontSize: 15, color: brand.muted }}>
                                            Nous avons hâte de vous accueillir à bord. Voici un récapitulatif de votre réservation.
                                        </p>

                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: brand.surface, borderRadius: 20, padding: 0 }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '24px 28px' }}>
                                                        <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Détails de la sortie</p>
                                                        <p style={{ margin: '0 0 6px', fontSize: 15 }}>📅 <strong>{date}</strong></p>
                                                        <p style={{ margin: '0 0 6px', fontSize: 15 }}>⏰ <strong>{time}</strong></p>
                                                        <p style={{ margin: '0 0 12px', fontSize: 15 }}>👥 {people} passagers</p>
                                                        {ageBreakdown && (
                                                            <p style={{ margin: '0 0 12px', fontSize: 13, color: brand.muted }}>
                                                                Répartition&nbsp;: {ageBreakdown}
                                                            </p>
                                                        )}
                                                        <p style={{ margin: 0, fontSize: 13, color: brand.muted }}>
                                                            Référence : <span style={{ fontWeight: 600 }}>{referenceLabel}</span>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>

                                {qrSrc && (
                                    <tr>
                                        <td style={{ padding: '0 32px' }}>
                                            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: 20 }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '24px', textAlign: 'center' }}>
                                                            <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#c2410c' }}>
                                                                Présentez ce QR Code à l&apos;embarquement
                                                            </p>
                                                            <img
                                                                src={qrSrc}
                                                                alt={`QR Code réservation ${referenceLabel}`}
                                                                width={200}
                                                                height={200}
                                                                style={{ display: 'block', margin: '0 auto', borderRadius: 16, backgroundColor: '#ffffff', padding: 12, border: '1px solid #fcd34d' }}
                                                            />
                                                            <p style={{ margin: '16px 0 0', fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
                                                                Si l&apos;image ne s&apos;affiche pas, conservez ce mail : l&apos;équipage pourra retrouver votre réservation grâce à la référence.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                )}

                                <tr>
                                    <td style={{ padding: '32px 32px 0' }}>
                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 18, border: '1px solid #fcd34d', background: '#fffbea' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '24px' }}>
                                                        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#b45309' }}>Montant de votre croisière</p>
                                                        <p style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700, color: '#92400e' }}>{priceFormatter.format(totalPrice)}</p>
                                                        <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                                                            Le détail complet du tarif est disponible dans la facture PDF jointe à ce message. Conservez-la pour votre comptabilité.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style={{ padding: '0 32px 32px' }}>
                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 18, border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '24px 24px 12px' }}>
                                                        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1d4ed8' }}>Important avant votre arrivée</p>
                                                        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#1e3a8a', lineHeight: 1.6 }}>
                                                            Merci de vous présenter au ponton <strong>10 minutes avant l&apos;heure de départ</strong> afin de faciliter l&apos;embarquement de votre équipage.
                                                        </p>
                                                        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
                                                            Point d&apos;embarquement&nbsp;: Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.
                                                        </p>
                                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #bfdbfe' }}>
                                                            <tbody>
                                                                <tr>
                                                                    <td style={{ padding: 0, textAlign: 'center', backgroundColor: '#ffffff' }}>
                                                                        <p style={{ margin: '16px 16px 0', fontSize: 13, color: '#1e3a8a' }}>Consultez l&apos;itinéraire :
                                                                        </p>
                                                                        <a
                                                                            href={mapLink}
                                                                            style={{
                                                                                display: 'inline-block',
                                                                                margin: '12px auto 16px',
                                                                                padding: '10px 22px',
                                                                                borderRadius: 999,
                                                                                backgroundColor: '#1d4ed8',
                                                                                color: '#fff',
                                                                                textDecoration: 'none',
                                                                                fontWeight: 600,
                                                                                fontSize: 13
                                                                            }}
                                                                        >
                                                                            Ouvrir dans Google Maps
                                                                        </a>
                                                                        <p style={{ margin: '0 16px 16px', fontSize: 11, color: '#1e3a8a', lineHeight: 1.5 }}>
                                                                            Si l&apos;ouverture échoue, copiez-collez ce lien dans votre navigateur&nbsp;:<br />
                                                                            <a href={mapLink} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{mapLink}</a>
                                                                        </p>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>

                                {reviewLink && (
                                    <tr>
                                        <td style={{ padding: '0 32px 32px' }}>
                                            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 18, border: '1px solid #fde68a', background: '#fffbea' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '24px', textAlign: 'center' }}>
                                                            <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#b45309' }}>Votre avis compte</p>
                                                            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#92400e', lineHeight: 1.6 }}>
                                                                Partagez votre expérience à bord pour aider les prochains voyageurs et soutenir l&apos;équipage.
                                                            </p>
                                                            <a
                                                                href={reviewLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    display: 'inline-block',
                                                                    padding: '12px 28px',
                                                                    borderRadius: 999,
                                                                    backgroundColor: '#f97316',
                                                                    color: '#fff7ed',
                                                                    textDecoration: 'none',
                                                                    fontWeight: 700,
                                                                    fontSize: 14
                                                                }}
                                                            >
                                                                Laisser un avis Google
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                )}

                                <tr>
                                    <td style={{ padding: '32px' }}>
                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 18, background: brand.night }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '24px', textAlign: 'center' }}>
                                                        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>
                                                            Besoin de modifier ou d&apos;annuler ?
                                                        </p>
                                                        <a
                                                            href={cancelUrl}
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '12px 28px',
                                                                borderRadius: 999,
                                                                backgroundColor: brand.gold,
                                                                color: brand.night,
                                                                textDecoration: 'none',
                                                                fontWeight: 700,
                                                                fontSize: 15
                                                            }}
                                                        >
                                                            Gérer ma réservation
                                                        </a>
                                                        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#cbd5f5' }}>
                                                            Politique : &gt;48h = 100% · 48–24h = 50% · &lt;24h/no-show = 0%. Alerte météo orange/rouge : remboursement intégral.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style={{ padding: '0 32px 32px', textAlign: 'center', color: brand.muted, fontSize: 13, lineHeight: 1.6 }}>
                                        <p style={{ margin: '0 0 12px' }}>Pont Saint-Pierre · 10 Rue de la Herse · 68000 Colmar</p>
                                        <p style={{ margin: '0 0 16px' }}>+33 3 89 20 68 92 · contact@sweet-narcisse.fr</p>
                                        <p style={{ margin: 0 }}>
                                            <a href="https://www.instagram.com/" style={{ color: brand.night, textDecoration: 'none', fontWeight: 600 }}>Instagram</a>
                                            <span style={{ margin: '0 8px', color: '#cbd5f5' }}>•</span>
                                            <a href="https://www.facebook.com/" style={{ color: brand.night, textDecoration: 'none', fontWeight: 600 }}>Facebook</a>
                                            <span style={{ margin: '0 8px', color: '#cbd5f5' }}>•</span>
                                            <a href="https://sweet-narcisse.fr/" style={{ color: brand.night, textDecoration: 'none', fontWeight: 600 }}>Site web</a>
                                        </p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
    )
}