/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { emailDictionaries, type EmailLang } from '@/dictionaries/emails';

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
    lang?: EmailLang
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
    reviewUrl,
    lang = 'fr'
}) => {
    const t = emailDictionaries.booking
    const referenceLabel = publicReference || bookingId
    const qrSrc = (qrCodeCid ? `cid:${qrCodeCid}` : (qrCodeDataUrl || qrCodeUrl || ''))
    const resolvedLogoSrc = logoCid ? `cid:${logoCid}` : (logoUrl || defaultLogoUrl)
    const ageBreakdownParts: string[] = []
    const reviewLink = reviewUrl || null

    if (adults > 0) {
        ageBreakdownParts.push(t.adults[lang](adults))
    }
    if (childrenCount > 0) {
        ageBreakdownParts.push(t.children[lang](childrenCount))
    }
    if (babies > 0) {
        ageBreakdownParts.push(t.babies[lang](babies))
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
                                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: 16, letterSpacing: 0.4 }}>{t.confirmationTitle[lang]}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '32px 32px 16px' }}>
                                        <p style={{ margin: '0 0 16px', fontSize: 18 }}>{t.hello[lang](firstName)}</p>
                                        <p style={{ margin: '0 0 24px', fontSize: 15, color: brand.muted }}>
                                            {t.welcomeMessage[lang]}
                                        </p>

                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: brand.surface, borderRadius: 20, padding: 0 }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '24px 28px' }}>
                                                        <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>{t.tripDetails[lang]}</p>
                                                        <p style={{ margin: '0 0 6px', fontSize: 15 }}>📅 <strong>{date}</strong></p>
                                                        <p style={{ margin: '0 0 6px', fontSize: 15 }}>⏰ <strong>{time}</strong></p>
                                                        <p style={{ margin: '0 0 12px', fontSize: 15 }}>👥 {t.passengers[lang](people)}</p>
                                                        {ageBreakdown && (
                                                            <p style={{ margin: '0 0 12px', fontSize: 13, color: brand.muted }}>
                                                                {t.breakdown[lang]}&nbsp;: {ageBreakdown}
                                                            </p>
                                                        )}
                                                        <p style={{ margin: 0, fontSize: 13, color: brand.muted }}>
                                                            {t.reference[lang]} : <span style={{ fontWeight: 600 }}>{referenceLabel}</span>
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
                                                                {t.qrCodePresent[lang]}
                                                            </p>
                                                            <img
                                                                src={qrSrc}
                                                                alt={`QR Code ${referenceLabel}`}
                                                                width={200}
                                                                height={200}
                                                                style={{ display: 'block', margin: '0 auto', borderRadius: 16, backgroundColor: '#ffffff', padding: 12, border: '1px solid #fcd34d' }}
                                                            />
                                                            <p style={{ margin: '16px 0 0', fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
                                                                {t.qrCodeFallback[lang]}
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
                                                        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#b45309' }}>{t.cruiseAmount[lang]}</p>
                                                        <p style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700, color: '#92400e' }}>{priceFormatter.format(totalPrice)}</p>
                                                        <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                                                            {t.invoiceNote[lang]}
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
                                                        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1d4ed8' }}>{t.importantBefore[lang]}</p>
                                                        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#1e3a8a', lineHeight: 1.6 }}>
                                                            {t.arriveEarly[lang]}
                                                        </p>
                                                        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
                                                            {t.boardingPoint[lang]}
                                                        </p>
                                                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #bfdbfe' }}>
                                                            <tbody>
                                                                <tr>
                                                                    <td style={{ padding: 0, textAlign: 'center', backgroundColor: '#ffffff' }}>
                                                                        <p style={{ margin: '16px 16px 0', fontSize: 13, color: '#1e3a8a' }}>{t.viewRoute[lang]}
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
                                                                            {t.openMaps[lang]}
                                                                        </a>
                                                                        <p style={{ margin: '0 16px 16px', fontSize: 11, color: '#1e3a8a', lineHeight: 1.5 }}>
                                                                            {t.mapFallback[lang]}<br />
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
                                                            <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#b45309' }}>{t.reviewMatters[lang]}</p>
                                                            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#92400e', lineHeight: 1.6 }}>
                                                                {t.reviewHelp[lang]}
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
                                                                {t.leaveGoogleReview[lang]}
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
                                                            {t.needToCancel[lang]}
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
                                                            {t.manageBooking[lang]}
                                                        </a>
                                                        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#cbd5f5' }}>
                                                            {t.cancelPolicyShort[lang]}
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