/* eslint-disable @next/next/no-img-element */
import * as React from 'react'
import { emailDictionaries, type EmailLang } from '@/dictionaries/emails'

export interface ReviewRequestTemplateProps {
  firstName: string
  experienceDate: string
  googleReviewUrl: string
  tripadvisorReviewUrl?: string | null
  logoUrl?: string | null
  lang?: EmailLang
}

const palette = {
  night: '#0f172a',
  sky: '#0ea5e9',
  sand: '#fef3c7',
  slate: '#475569'
}

const runtimeBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '')
const fallbackLogo = runtimeBaseUrl ? `${runtimeBaseUrl}/images/logo.jpg` : undefined

export const ReviewRequestTemplate: React.FC<Readonly<ReviewRequestTemplateProps>> = ({
  firstName,
  experienceDate,
  googleReviewUrl,
  tripadvisorReviewUrl,
  logoUrl,
  lang = 'fr'
}) => {
  const t = emailDictionaries.review
  const resolvedLogo = logoUrl ?? fallbackLogo
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: '#f1f5f9', padding: '24px 0', fontFamily: 'Arial, Helvetica, sans-serif', color: palette.night }}>
      <tbody>
        <tr>
          <td align="center">
            <table width="560" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '32px 24px', background: palette.night, textAlign: 'center' }}>
                    {resolvedLogo ? (
                      <img src={resolvedLogo} alt="Sweet Narcisse" width={150} height={46} style={{ display: 'block', margin: '0 auto 12px' }} />
                    ) : (
                      <span style={{ color: palette.sky, fontSize: 26, fontWeight: 700 }}>Sweet Narcisse</span>
                    )}
                    <p style={{ margin: 0, color: '#e2e8f0', letterSpacing: 0.4 }}>{t.serviceTitle[lang]}</p>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '32px 32px 16px' }}>
                    <p style={{ margin: '0 0 16px', fontSize: 18 }}>{t.hello[lang](firstName)}</p>
                    <p style={{ margin: '0 0 16px', fontSize: 15, color: palette.slate }}>
                      {t.thankYou[lang](experienceDate)}
                    </p>
                    <p style={{ margin: 0, fontSize: 15 }}>{t.askReview[lang]}</p>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0 32px 32px' }}>
                    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 18, border: '1px solid #bae6fd', backgroundColor: '#f0f9ff' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '24px', textAlign: 'center' }}>
                            <a
                              href={googleReviewUrl}
                              style={{
                                display: 'inline-block',
                                padding: '14px 28px',
                                borderRadius: 999,
                                backgroundColor: palette.sky,
                                color: palette.night,
                                fontWeight: 700,
                                textDecoration: 'none',
                                fontSize: 15
                              }}
                            >
                              {t.googleButton[lang]}
                            </a>
                            {tripadvisorReviewUrl && (
                              <p style={{ margin: '18px 0 0', fontSize: 13, color: palette.slate }}>
                                {t.orTripadvisor[lang]} <a href={tripadvisorReviewUrl} style={{ color: palette.night, fontWeight: 600, textDecoration: 'none' }}>TripAdvisor</a>
                              </p>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0 32px 32px' }}>
                    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: 18, border: '1px dashed #fde68a', background: palette.sand }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '20px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#92400e' }}>{t.whyMattersTitle[lang]}</p>
                            <ul style={{ margin: 0, paddingLeft: 20, color: '#b45309', fontSize: 13, lineHeight: 1.6 }}>
                              <li>{t.whyMattersPoint1[lang]}</li>
                              <li>{t.whyMattersPoint2[lang]}</li>
                              <li>{t.whyMattersPoint3[lang]}</li>
                            </ul>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0 32px 32px', textAlign: 'center', fontSize: 12, color: palette.slate }}>
                    <p style={{ margin: '0 0 8px' }}>experience@sweet-narcisse.fr</p>
                    <p style={{ margin: 0 }}>Pont Saint-Pierre · 10 Rue de la Herse · 68000 Colmar</p>
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
