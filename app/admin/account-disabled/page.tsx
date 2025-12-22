import Image from 'next/image'
import OptimizedImage from '@/components/OptimizedImage'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logout } from '@/lib/actions'

const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export default async function AccountDisabledPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.isActive !== false) {
    redirect('/admin')
  }

  const userId = session.user.id
  const record = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          employmentEndDate: true,
          archiveReason: true
        }
      })
    : null

  const displayName = record
    ? `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim() || record.email || 'Compte Sweet Narcisse'
    : session.user.name || session.user.email || 'Compte Sweet Narcisse'
  const endLabel = record?.employmentEndDate ? formatter.format(record.employmentEndDate) : null
  const reasonLabel = record?.archiveReason?.trim() || null

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <OptimizedImage src="/images/logo.webp" fallback="/images/logo.jpg" alt="Sweet Narcisse" width={120} height={32} className="h-8 w-auto rounded-md" priority />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Compte désactivé</p>
            <h1 className="mt-4 text-3xl font-serif font-semibold text-white">Accès administrateur suspendu</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {displayName}, vos accès au panneau d&apos;administration ont été désactivés. Vous ne pouvez plus consulter les outils internes tant
              qu&apos;un administrateur n&apos;a pas réactivé votre profil.
            </p>
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-100">
            {endLabel && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Date de fin</span>
                <span className="text-base font-semibold text-white">{endLabel}</span>
              </div>
            )}
            {reasonLabel && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Motif indiqué</span>
                <span className="text-base text-slate-100">{reasonLabel}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Dernier compte connecté</span>
              <span className="text-base text-slate-100">{session.user.email ?? record?.email ?? '—'}</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200/30 bg-amber-500/10 p-5 text-sm text-amber-100">
            <p className="font-semibold text-amber-200">Besoin d&apos;aide ?</p>
            <p className="mt-1">Contactez un administrateur Sweet Narcisse pour réactiver votre accès ou clarifier la situation.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-base font-semibold text-white">
              <Link href="mailto:operations@sweet-narcisse.fr" className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:border-white/60">
                ✉️ operations@sweet-narcisse.fr
              </Link>
              <Link href="tel:+33556450000" className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:border-white/60">
                ☎️ +33 5 56 45 00 00
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <form action={logout}>
              <button type="submit" className="rounded-full border border-white/20 px-4 py-2 font-semibold text-white transition hover:border-white/60">
                Retour à la connexion
              </button>
            </form>
            <Link href="/" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white">
              Consulter le site public →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
