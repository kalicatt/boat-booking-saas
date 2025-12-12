'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { FormEvent, ChangeEvent, MouseEvent } from 'react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PdfViewer } from '@/components/PdfViewer'
import { AdminPageShell } from '../_components/AdminPageShell'
import zxcvbn from 'zxcvbn'
import {
    ADMIN_PERMISSION_CONFIG,
    ADMIN_PERMISSION_GROUPS,
    ADMIN_PERMISSION_SECTIONS,
    type AdminPermissionKey,
    type AdminPermissionAction,
    type AdminPermissions,
    createEmptyAdminPermissions,
    resolveAdminPermissions,
    hasPermission,
    hasPageAccess
} from '@/types/adminPermissions'

type Props = { canManage?: boolean }

type EmployeeRole = 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'GUEST' | string

type EmployeeRecord = {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postalCode?: string | null
    country?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    hireDate?: string | null
    department?: string | null
    jobTitle?: string | null
    employmentStatus?: string | null
    fullTime?: boolean | null
    isFullTime?: boolean | null
    hourlyRate?: number | string | null
    salary?: number | string | null
    annualSalary?: number | string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    notes?: string | null
    password?: string | null
    role?: EmployeeRole | null
    image?: string | null
    employeeNumber?: string | null
    manager?: { firstName?: string | null; lastName?: string | null } | null
    adminPermissions?: AdminPermissions
    isActive?: boolean | null
    employmentEndDate?: string | null
    archiveReason?: string | null
}

type DirectoryFilter = 'active' | 'inactive' | 'all'

const DIRECTORY_FILTER_QUERY_KEY = 'teamFilter'

const parseDirectoryFilter = (value: string | null): DirectoryFilter => {
    if (value === 'inactive' || value === 'all') return value
    return 'active'
}

const SECTION_CARD_CLASS = 'rounded-2xl border border-slate-100 bg-white/70 p-4 space-y-4 shadow-sm'
const PASSWORD_STRENGTH_LABELS = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'] as const
const PASSWORD_STRENGTH_CLASSES = ['bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'] as const

type PasswordStrengthInfo = {
    score: number
    label: string
    color: string
    helper?: string
    progress: number
}

const getPasswordInsights = (password?: string | null, inputs: Array<string | null | undefined> = []): PasswordStrengthInfo | null => {
    if (!password) return null
    const payload = zxcvbn(password, inputs.filter(Boolean) as string[])
    const score = Math.min(4, Math.max(0, payload.score))
    const progress = ((score + 1) / PASSWORD_STRENGTH_LABELS.length) * 100
    return {
        score,
        label: PASSWORD_STRENGTH_LABELS[score],
        color: PASSWORD_STRENGTH_CLASSES[score],
        helper: payload.feedback.warning || payload.feedback.suggestions[0] || undefined,
        progress
    }
}

const RequiredIndicator = () => (
    <span className="ml-1 font-semibold text-rose-500">
        *
        <span className="sr-only">Champ obligatoire</span>
    </span>
)

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400">{title}</h4>
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
    )
}

function PasswordStrengthIndicator({ info, idleHint }: { info?: PasswordStrengthInfo | null; idleHint?: string }) {
    if (!info) {
        return idleHint ? <p className="text-[11px] text-slate-400">{idleHint}</p> : null
    }
    return (
        <div className="space-y-1" aria-live="polite">
            <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${info.color}`} style={{ width: `${info.progress}%` }} />
            </div>
            <div className="flex flex-wrap justify-between text-[11px] text-slate-500">
                <span>{info.label}</span>
                {info.helper && <span className="text-slate-400">{info.helper}</span>}
            </div>
        </div>
    )
}

function EmployeeDocumentsPanel({ employeeId, employeeName, open, canEdit }: EmployeeDocumentsPanelProps) {
    const [documents, setDocuments] = useState<EmployeeDocumentSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedDoc, setSelectedDoc] = useState<EmployeeDocumentSummary | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [uploadCategory, setUploadCategory] = useState('')
    const [uploadExpiresAt, setUploadExpiresAt] = useState('')
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'confirming' | 'success'>('idle')
    const [flashMessage, setFlashMessage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const fetchDocuments = useCallback(async () => {
        if (!employeeId) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/employees/${employeeId}/documents`, { cache: 'no-store' })
            if (!res.ok) {
                const err = (await res.json().catch(() => null)) as { error?: string } | null
                throw new Error(err?.error || 'Impossible de charger les documents')
            }
            const payload = (await res.json().catch(() => [])) as EmployeeDocumentSummary[]
            setDocuments(payload)
        } catch (caught) {
            console.error(caught)
            setError(caught instanceof Error ? caught.message : 'Erreur réseau')
        } finally {
            setLoading(false)
        }
    }, [employeeId])

    useEffect(() => {
        if (!open) {
            setPreviewUrl(null)
            setSelectedDoc(null)
            return
        }
        fetchDocuments()
    }, [open, fetchDocuments])

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null
        setUploadFile(nextFile)
    }

    const resetUploadForm = (options?: { preserveStatus?: boolean }) => {
        setUploadCategory('')
        setUploadExpiresAt('')
        setUploadFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        if (!options?.preserveStatus) {
            setUploadProgress(0)
            setUploadStatus('idle')
            setFlashMessage(null)
        }
    }

    const handleUpload = async (event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault()
        if (!uploadFile || !uploadCategory.trim()) {
            setError('Fichier et catégorie requis.')
            return
        }
        const fileLabel = uploadFile.name
        let succeeded = false
        setUploading(true)
        setError(null)
        setUploadStatus('uploading')
        setUploadProgress(0)
            setFlashMessage(null)
        try {
            const payload = {
                userId: employeeId,
                category: uploadCategory.trim(),
                fileName: fileLabel,
                mimeType: uploadFile.type || 'application/octet-stream',
                size: uploadFile.size,
                expiresAt: uploadExpiresAt || undefined
            }
            const signedRes = await fetch('/api/admin/files/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!signedRes.ok) {
                const err = (await signedRes.json().catch(() => null)) as { error?: string } | null
                throw new Error(err?.error || 'Échec préparation upload')
            }
            const signedPayload = (await signedRes.json()) as {
                uploadUrl: string
                document: { id: string }
            }

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.open('PUT', signedPayload.uploadUrl)
                xhr.setRequestHeader('Content-Type', payload.mimeType)
                xhr.upload.onprogress = (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                        setUploadProgress(percent)
                    }
                }
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve()
                    } else {
                        reject(new Error('Échec envoi vers le stockage'))
                    }
                }
                xhr.onerror = () => reject(new Error('Échec envoi vers le stockage'))
                xhr.send(uploadFile)
            })

            setUploadStatus('confirming')

            const confirmRes = await fetch('/api/admin/files/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: signedPayload.document.id })
            })
            if (!confirmRes.ok) {
                const err = (await confirmRes.json().catch(() => null)) as { error?: string } | null
                throw new Error(err?.error || 'Confirmation impossible')
            }

            setUploadStatus('success')
            setUploadProgress(100)
            succeeded = true
            await fetchDocuments()
            resetUploadForm({ preserveStatus: true })
            setFlashMessage(`Document "${fileLabel}" importé.`)
            setTimeout(() => setFlashMessage(null), 5000)
        } catch (caught) {
            console.error(caught)
            setUploadStatus('idle')
            setUploadProgress(0)
            setError(caught instanceof Error ? caught.message : 'Upload impossible')
        } finally {
            setUploading(false)
            if (!succeeded) {
                setUploadStatus('idle')
            } else {
                setTimeout(() => {
                    setUploadStatus('idle')
                    setUploadProgress(0)
                }, 2000)
            }
        }
    }

    const requestDownloadUrl = async (documentId: string) => {
        const res = await fetch('/api/admin/files/download-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId })
        })
        if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null
            throw new Error(err?.error || 'Téléchargement indisponible')
        }
        const payload = (await res.json()) as { downloadUrl: string }
        return payload.downloadUrl
    }

    const ensureInteractiveDocument = (doc: EmployeeDocumentSummary) => {
        if (doc.status === 'ARCHIVED') {
            setError('Ce document est archivé et ne peut plus être consulté.')
            return false
        }
        return true
    }

    const handlePreview = (doc: EmployeeDocumentSummary) => {
        if (!ensureInteractiveDocument(doc)) return
        setSelectedDoc(doc)
        setPreviewUrl(`/api/admin/files/${doc.id}/preview?ts=${Date.now()}`)
    }

    const handleDownload = async (doc: EmployeeDocumentSummary) => {
        try {
            if (!ensureInteractiveDocument(doc)) return
            const url = await requestDownloadUrl(doc.id)
            window.open(url, '_blank', 'noopener,noreferrer')
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Téléchargement refusé')
        }
    }

    const handleArchive = async (doc: EmployeeDocumentSummary) => {
        const reason = prompt('Raison de l’archivage (optionnel):') ?? undefined
        try {
            const res = await fetch('/api/admin/files/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: doc.id, reason })
            })
            if (!res.ok) {
                const err = (await res.json().catch(() => null)) as { error?: string } | null
                throw new Error(err?.error || 'Archivage impossible')
            }
            await fetchDocuments()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Erreur archivage')
        }
    }

    const handleDelete = async (doc: EmployeeDocumentSummary) => {
        if (!canEdit) return
        if (!confirm(`Supprimer définitivement "${doc.fileName}" ? Cette action est irréversible.`)) {
            return
        }
        try {
            const res = await fetch(`/api/admin/files/${doc.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const err = (await res.json().catch(() => null)) as { error?: string } | null
                throw new Error(err?.error || 'Suppression impossible')
            }
            if (selectedDoc?.id === doc.id) {
                setSelectedDoc(null)
                setPreviewUrl(null)
            }
            await fetchDocuments()
            setFlashMessage(`Document "${doc.fileName}" supprimé.`)
            setTimeout(() => setFlashMessage(null), 5000)
        } catch (caught) {
            console.error(caught)
            setError(caught instanceof Error ? caught.message : 'Erreur suppression')
        }
    }

    const visibleDocs = documents
    const hasDocuments = visibleDocs.length > 0

    return (
        <section className="space-y-3 rounded-3xl border border-slate-100 bg-white/40 p-4">
            <div className="flex flex-col gap-1">
                <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400">Documents</h4>
                <p className="text-sm text-slate-500">Contrats, justificatifs, attestations liés à {employeeName}.</p>
            </div>

            {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p>}
            {flashMessage && (
                <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{flashMessage}</p>
            )}

            <div className="flex items-center justify-between">
                <button type="button" className="text-xs font-semibold text-slate-500" onClick={fetchDocuments} disabled={loading}>
                    {loading ? 'Actualisation…' : 'Rafraîchir la liste'}
                </button>
                <span className="text-xs text-slate-400">{hasDocuments ? `${visibleDocs.length} document(s)` : 'Aucun document'}</span>
            </div>

            {canEdit && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 space-y-3 bg-white" role="group" aria-labelledby={`doc-upload-${employeeId}`}>
                    <p id={`doc-upload-${employeeId}`} className="text-xs font-semibold text-slate-500">Ajouter un document</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Catégorie</label>
                            <input className="w-full rounded border p-2" value={uploadCategory} onChange={(e)=>setUploadCategory(e.target.value)} placeholder="Contrat, RIB, etc." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Expiration (optionnel)</label>
                            <input type="date" className="w-full rounded border p-2" value={uploadExpiresAt} onChange={(e)=>setUploadExpiresAt(e.target.value)} />
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" className="w-full" onChange={handleFileChange} accept="application/pdf,image/*,.doc,.docx" />
                    <div className="flex justify-end gap-2">
                        <button type="button" className="text-xs text-slate-500" onClick={() => resetUploadForm()}>Réinitialiser</button>
                        <button type="button" className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white" onClick={handleUpload} disabled={uploading}>
                            {uploading ? 'Envoi…' : 'Uploader'}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {loading && <p className="text-sm text-slate-500">Chargement…</p>}
                {!loading && !hasDocuments && <p className="text-sm text-slate-500">Aucun document enregistré pour cet employé.</p>}
                {hasDocuments && (
                    <ul className="space-y-2">
                        {visibleDocs.map((doc) => (
                            <li key={doc.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-slate-900">{doc.fileName}</span>
                                    <span className="text-xs text-slate-400">{doc.category}</span>
                                    <span className="text-xs text-slate-400">v{doc.version}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        doc.status === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : doc.status === 'ARCHIVED'
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {doc.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Ajouté le {formatDate(doc.uploadedAt || doc.createdAt)} · {formatBytes(doc.size)} · {doc.mimeType}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <button
                                        className={`rounded-full border border-slate-200 px-3 py-1 ${doc.status === 'ARCHIVED' ? 'cursor-not-allowed opacity-50' : ''}`}
                                        type="button"
                                        onClick={()=>handlePreview(doc)}
                                        disabled={doc.status === 'ARCHIVED'}
                                        title={doc.status === 'ARCHIVED' ? 'Document archivé, aucune prévisualisation disponible' : undefined}
                                    >
                                        Prévisualiser
                                    </button>
                                    <button
                                        className={`rounded-full border border-slate-200 px-3 py-1 ${doc.status === 'ARCHIVED' ? 'cursor-not-allowed opacity-50' : ''}`}
                                        type="button"
                                        onClick={()=>handleDownload(doc)}
                                        disabled={doc.status === 'ARCHIVED'}
                                        title={doc.status === 'ARCHIVED' ? 'Document archivé, téléchargement désactivé' : undefined}
                                    >
                                        Télécharger
                                    </button>
                                    {canEdit && doc.status !== 'ARCHIVED' && (
                                        <button className="rounded-full border border-rose-200 px-3 py-1 text-rose-600" type="button" onClick={()=>handleArchive(doc)}>
                                            Archiver
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button className="rounded-full border border-red-200 px-3 py-1 text-red-600" type="button" onClick={()=>handleDelete(doc)}>
                                            Supprimer
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                            {uploadStatus !== 'idle' && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                        <span>
                                            {uploadStatus === 'uploading'
                                                ? 'Envoi du fichier…'
                                                : uploadStatus === 'confirming'
                                                ? 'Confirmation côté serveur…'
                                                : 'Import terminé'}
                                        </span>
                                        {uploadStatus === 'uploading' && <span>{uploadProgress}%</span>}
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full ${uploadStatus === 'success' ? 'bg-emerald-500' : 'bg-slate-900'}`}
                                            style={{ width: `${uploadStatus === 'uploading' ? uploadProgress : 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                    </ul>
                )}
            </div>

            {previewUrl && selectedDoc && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-600">Prévisualisation : {selectedDoc.fileName}</p>
                        <button type="button" className="text-xs text-slate-500" onClick={()=>{setPreviewUrl(null); setSelectedDoc(null)}}>
                            Fermer
                        </button>
                    </div>
                    {selectedDoc.mimeType === 'application/pdf' ? (
                        <PdfViewer src={previewUrl} fileName={selectedDoc.fileName} hint="PDF privé" />
                    ) : selectedDoc.mimeType.startsWith('image/') ? (
                        <Image src={previewUrl} alt={selectedDoc.fileName} width={800} height={600} className="max-h-72 w-full rounded object-contain" unoptimized />
                    ) : (
                        <p className="text-xs text-slate-500">Prévisualisation non disponible pour ce format.</p>
                    )}
                    <p className="text-[11px] text-slate-400">Les liens sécurisés expirent rapidement, relancez l’aperçu si nécessaire.</p>
                </div>
            )}
        </section>
    )
}

function EmployeeDocumentsModal({ open, onClose, employee, canEdit }: EmployeeDocumentsModalProps) {
    if (!open || !employee) return null
    const employeeName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.email

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="sn-card w-full max-w-4xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Documents</p>
                        <h3 className="text-lg font-bold text-slate-900">{employeeName}</h3>
                        {employee.employeeNumber && (
                            <p className="text-xs text-slate-400">Matricule #{employee.employeeNumber}</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                        Fermer
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-auto px-5 py-4">
                    <EmployeeDocumentsPanel
                        employeeId={employee.id}
                        employeeName={employeeName}
                        open={open}
                        canEdit={canEdit}
                    />
                </div>
            </div>
        </div>
    )
}

type EmployeeDocumentStatus = 'PENDING' | 'ACTIVE' | 'ARCHIVED'

type BasicUserRef = {
    id: string
    firstName?: string | null
    lastName?: string | null
} | null

type EmployeeDocumentSummary = {
    id: string
    userId: string
    category: string
    fileName: string
    mimeType: string
    size: number
    version: number
    status: EmployeeDocumentStatus
    uploadedAt?: string | null
    archivedAt?: string | null
    expiresAt?: string | null
    createdAt?: string | null
    uploadedBy?: BasicUserRef
    archivedBy?: BasicUserRef
}

type MeResponse = { role?: EmployeeRole | null; permissions?: AdminPermissions }

type CreateEmployeeForm = {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
    postalCode: string
    country: string
    dateOfBirth: string
    gender: string
    hireDate: string
    department: string
    jobTitle: string
    employmentStatus: string
    fullTime: boolean
    hourlyRate: string
    salary: string
    emergencyContactName: string
    emergencyContactPhone: string
    notes: string
    password: string
    role: EmployeeRole
    permissions: AdminPermissions
}

type EmployeeWithUser = { user: EmployeeRecord }

const createDefaultFormState = (): CreateEmployeeForm => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    dateOfBirth: '',
    gender: '',
    hireDate: '',
    department: '',
    jobTitle: '',
    employmentStatus: 'PERMANENT',
    fullTime: true,
    hourlyRate: '',
    salary: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    password: '',
    role: 'EMPLOYEE',
    permissions: createEmptyAdminPermissions()
})

const isEmployeeRecord = (value: unknown): value is EmployeeRecord => {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<EmployeeRecord>
    return typeof candidate.id === 'string' && typeof candidate.firstName === 'string' && typeof candidate.lastName === 'string' && typeof candidate.email === 'string'
}

const parseEmployeesResponse = (payload: unknown): EmployeeRecord[] => {
    if (!Array.isArray(payload)) return []
    return payload
        .filter(isEmployeeRecord)
        .map((record) => ({
            ...record,
            adminPermissions: ensurePermissions(record.adminPermissions)
        }))
}

const extractEmployee = (payload: unknown): EmployeeRecord | null => {
    if (!payload || typeof payload !== 'object') return null
    if (isEmployeeRecord(payload)) {
        return {
            ...payload,
            adminPermissions: ensurePermissions(payload.adminPermissions)
        }
    }
    const candidate = payload as EmployeeWithUser
    if (candidate && typeof candidate === 'object' && candidate.user && isEmployeeRecord(candidate.user)) {
        return {
            ...candidate.user,
            adminPermissions: ensurePermissions(candidate.user.adminPermissions)
        }
    }
    return null
}

const rolePriority: Record<EmployeeRole, number> = {
    SUPERADMIN: 0,
    ADMIN: 1,
    MANAGER: 2,
    EMPLOYEE: 3,
    GUEST: 4
}

const PERMISSION_GROUPED_SECTIONS = Object.entries(ADMIN_PERMISSION_GROUPS)
    .map(([groupKey, meta]) => ({
        key: groupKey as keyof typeof ADMIN_PERMISSION_GROUPS,
        label: meta.label,
        sections: ADMIN_PERMISSION_SECTIONS.filter((section) => ADMIN_PERMISSION_CONFIG[section.key].group === groupKey)
    }))
    .filter((entry) => entry.sections.length > 0)

const ensurePermissions = (value?: AdminPermissions | null): AdminPermissions =>
    value ? resolveAdminPermissions(value) : createEmptyAdminPermissions()

const resolvePermissionField = <K extends AdminPermissionKey>(
    key: K,
    field: 'enabled' | string
): ('enabled' | AdminPermissionAction<K>) | null => {
    if (field === 'enabled') return 'enabled'
    const action = ADMIN_PERMISSION_CONFIG[key].actions.find((candidate) => candidate.key === field)
    return action ? (action.key as AdminPermissionAction<K>) : null
}

const applyPermissionToggle = <K extends AdminPermissionKey>(
    permissions: AdminPermissions | undefined,
    key: K,
    field: 'enabled' | AdminPermissionAction<K>,
    value: boolean
): AdminPermissions => {
    const base = permissions ? { ...permissions } : createEmptyAdminPermissions()
    const current = { ...base[key] }

    if (field === 'enabled') {
        current.enabled = value
        if (!value) {
            for (const action of ADMIN_PERMISSION_CONFIG[key].actions) {
                ;(current as Record<string, boolean>)[action.key] = false
            }
        }
    } else {
        ;(current as Record<string, boolean>)[field] = value
    }

    return { ...base, [key]: current }
}

const sortEmployees = (list: EmployeeRecord[]): EmployeeRecord[] => {
    return [...list].sort((a, b) => {
        const aPriority = rolePriority[a.role ?? 'EMPLOYEE'] ?? 10
        const bPriority = rolePriority[b.role ?? 'EMPLOYEE'] ?? 10
        if (aPriority !== bPriority) return aPriority - bPriority
        return a.lastName.localeCompare(b.lastName)
    })
}

const formatBytes = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '—'
    const units = ['o', 'Ko', 'Mo', 'Go']
    let size = value
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex += 1
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const formatDate = (value?: string | null) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ClientEmployeesPage({ canManage = false }: Props) {
    const [employees, setEmployees] = useState<EmployeeRecord[]>([])
    const [myRole, setMyRole] = useState<EmployeeRole>('EMPLOYEE')
    const [myPermissions, setMyPermissions] = useState<AdminPermissions>(() => createEmptyAdminPermissions())
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)

    const [editTarget, setEditTarget] = useState<EmployeeRecord | null>(null)
    const [editErrors, setEditErrors] = useState<string[]>([])
    const [form, setForm] = useState<CreateEmployeeForm>(() => createDefaultFormState())
    const [statusAction, setStatusAction] = useState<{ mode: 'archive' | 'reactivate'; employee: EmployeeRecord } | null>(null)
    const [documentsTarget, setDocumentsTarget] = useState<EmployeeRecord | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
                const mePayload = (await meRes.json()) as MeResponse
                setMyRole(typeof mePayload?.role === 'string' ? mePayload.role : 'EMPLOYEE')
                setMyPermissions(ensurePermissions(mePayload?.permissions))
                const res = await fetch('/api/admin/employees', { credentials: 'include', cache: 'no-store' })
                const employeesPayload = (await res.json()) as unknown
                setEmployees(sortEmployees(parseEmployeesResponse(employeesPayload)))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const method = 'POST'
        const res = await fetch('/api/admin/employees', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        if (res.ok) {
            const createdPayload = (await res.json().catch(() => null)) as unknown
            const createdUser = extractEmployee(createdPayload)
            if (createdUser) {
                setEmployees((prev) => sortEmployees([createdUser, ...prev]))
            }
            setForm(createDefaultFormState())
        } else {
            const error = (await res.json().catch(() => null)) as { error?: string } | null
            alert(error?.error || "Impossible de créer le collaborateur")
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Supprimer ${name} ?`)) return
        const res = await fetch(`/api/admin/employees?id=${id}`, { method: 'DELETE' })
        if (res.ok) setEmployees((prev) => prev.filter(e => e.id !== id))
    }

    // Prefer server-provided canManage flag; fallback to role check client-side
    const canViewEmployees = myRole === 'SUPERADMIN' || myRole === 'ADMIN' || hasPageAccess(myPermissions, 'employees')
    const canEditEmployees = canManage || myRole === 'SUPERADMIN' || myRole === 'ADMIN' || hasPermission(myPermissions, 'employees', 'edit')
    const canInviteEmployees = myRole === 'SUPERADMIN' || myRole === 'ADMIN' || hasPermission(myPermissions, 'employees', 'invite')
    const localCanManage = canEditEmployees
    const allowCreate = localCanManage && canInviteEmployees

    return (
        <AdminPageShell
            title="Équipe & comptes"
            description="Gérez les accès, les coordonnées et les statuts de l&apos;équipe Sweet Narcisse."
            actions={allowCreate ? (
                <button onClick={()=>setShowCreateModal(true)} className="sn-btn-primary">+ Nouveau collaborateur</button>
            ) : undefined}
        >
            {!localCanManage && !loading && (
                <p className="inline-flex items-center gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                    🔒 Mode lecture seule — vous n&apos;avez pas les droits de modification
                </p>
            )}

            {!canViewEmployees && !loading && (
                <p className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    ❗️ Accès refusé — contactez un administrateur pour obtenir les droits nécessaires.
                </p>
            )}

            {canViewEmployees && (
                <>
                    <CreateEmployeeModal
                        open={showCreateModal}
                        onClose={()=>setShowCreateModal(false)}
                        onSubmit={(event)=>{handleSubmit(event); setShowCreateModal(false)}}
                        form={form}
                        setForm={setForm}
                        myRole={myRole}
                    />

                    {localCanManage ? (
                        <div className="sn-card overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4">Collaborateur</th>
                                        <th className="p-4">Coordonnées</th>
                                        <th className="p-4">Poste</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {loading && (
                                        <tr><td colSpan={4} className="p-8 text-center">Chargement...</td></tr>
                                    )}
                                    {!loading && employees.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center">Aucun collaborateur.</td></tr>
                                    )}
                                    {!loading && employees.length > 0 &&
                                        employees.map((emp) => (
                                            <tr key={emp.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                                <td className="p-4 align-top">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">
                                                            {emp.image ? (
                                                                <Image src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} width={48} height={48} className="h-full w-full rounded-full object-cover" />
                                                            ) : (
                                                                `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-semibold text-slate-900">
                                                                {emp.firstName} {emp.lastName}
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                                                                <span className={`rounded-full px-2 py-0.5 border ${
                                                                    emp.role === 'SUPERADMIN'
                                                                        ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                                                                        : emp.role === 'ADMIN'
                                                                        ? 'border-purple-200 bg-purple-100 text-purple-700'
                                                                        : 'border-blue-200 bg-blue-100 text-blue-700'
                                                                }`}>
                                                                    {emp.role}
                                                                </span>
                                                                {emp.employeeNumber && (
                                                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500">
                                                                        #{emp.employeeNumber}
                                                                    </span>
                                                                )}
                                                                {emp.isActive === false && (
                                                                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                                                                        Archivé
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-sm text-slate-600">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2"><span aria-hidden="true">📧</span><span>{emp.email}</span></div>
                                                        <div className="flex items-center gap-2"><span aria-hidden="true">📞</span><span>{emp.phone || '-'}</span></div>
                                                        <div className="flex items-start gap-2 text-xs text-slate-400"><span aria-hidden="true">🏠</span><span>{emp.address || emp.city || emp.postalCode ? `${emp.address ?? ''} ${emp.postalCode ?? ''} ${emp.city ?? ''}`.trim() : '-'}</span></div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-sm text-slate-600">
                                                    <div>{emp.jobTitle || '—'}</div>
                                                    <div className="text-xs text-slate-400">{emp.department || '—'}</div>
                                                    {emp.manager && (
                                                        <div className="mt-2 text-xs text-slate-500">
                                                            Manager : {emp.manager.firstName} {emp.manager.lastName}
                                                        </div>
                                                    )}
                                                    {emp.isActive === false && (
                                                        <div className="mt-2 text-xs text-rose-600">
                                                            Archivé
                                                            {emp.employmentEndDate && (
                                                                <span> depuis le {formatDate(emp.employmentEndDate)}</span>
                                                            )}
                                                            {emp.archiveReason && (
                                                                <span> — {emp.archiveReason}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right align-top">
                                                    {emp.role === 'SUPERADMIN' ? (
                                                        <span className="text-xs text-slate-400">Compte protégé</span>
                                                    ) : (
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setDocumentsTarget(emp)}
                                                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                                                            >
                                                                Documents
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditTarget({
                                                                        ...emp,
                                                                        fullTime: typeof emp.fullTime === 'boolean'
                                                                            ? emp.fullTime
                                                                            : (typeof emp.isFullTime === 'boolean' ? emp.isFullTime : true),
                                                                        salary: emp.salary ?? emp.annualSalary ?? '',
                                                                        adminPermissions: ensurePermissions(emp.adminPermissions)
                                                                    })
                                                                    setEditErrors([])
                                                                }}
                                                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                                                            >
                                                                {myRole === 'SUPERADMIN' ? 'Modifier' : 'Consulter'}
                                                            </button>
                                                            {myRole === 'SUPERADMIN' && emp.isActive !== false && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStatusAction({ mode: 'archive', employee: emp })}
                                                                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 hover:text-rose-700"
                                                                >
                                                                    Archiver
                                                                </button>
                                                            )}
                                                            {myRole === 'SUPERADMIN' && emp.isActive === false && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStatusAction({ mode: 'reactivate', employee: emp })}
                                                                    className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                                                                >
                                                                    Réactiver
                                                                </button>
                                                            )}
                                                            {myRole === 'SUPERADMIN' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(emp.id, emp.firstName)}
                                                                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:text-red-700"
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmployeeDirectory employees={employees} loading={loading} />
                    )}

                    <EditEmployeeModal
                        open={localCanManage && !!editTarget}
                        onClose={()=>{setEditTarget(null); setEditErrors([])}}
                        employee={editTarget}
                        setEmployee={setEditTarget}
                        canEdit={myRole === 'SUPERADMIN'}
                        errors={editErrors}
                        setErrors={setEditErrors}
                        onSaved={(updated)=>{
                            setEmployees(prev => sortEmployees(prev.map(e => e.id === updated.id ? { ...e, ...updated } : e)))
                            setEditTarget(null)
                        }}
                    />
                    <EmployeeDocumentsModal
                        open={!!documentsTarget}
                        employee={documentsTarget}
                        onClose={()=>setDocumentsTarget(null)}
                        canEdit={localCanManage}
                    />
                    <EmployeeStatusModal
                        open={!!statusAction}
                        mode={statusAction?.mode ?? 'archive'}
                        employee={statusAction?.employee ?? null}
                        onClose={()=>setStatusAction(null)}
                        onCompleted={(updated)=>{
                            setEmployees(prev => sortEmployees(prev.map(e => e.id === updated.id ? { ...e, ...updated } : e)))
                            setStatusAction(null)
                        }}
                    />
                </>
            )}
        </AdminPageShell>
    )
}

interface EditEmployeeModalProps {
    open: boolean
    onClose: () => void
    employee: EmployeeRecord | null
    setEmployee: React.Dispatch<React.SetStateAction<EmployeeRecord | null>>
    canEdit: boolean
    errors: string[]
    setErrors: React.Dispatch<React.SetStateAction<string[]>>
    onSaved: (updated: EmployeeRecord) => void
}

interface CreateEmployeeModalProps {
    open: boolean
    onClose: () => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
    form: CreateEmployeeForm
    setForm: React.Dispatch<React.SetStateAction<CreateEmployeeForm>>
    myRole: EmployeeRole
}

interface EmployeeDirectoryProps {
    employees: EmployeeRecord[]
    loading: boolean
}

interface EmployeeStatusModalProps {
    open: boolean
    mode: 'archive' | 'reactivate'
    employee: EmployeeRecord | null
    onClose: () => void
    onCompleted: (updated: EmployeeRecord) => void
}

interface EmployeeDocumentsPanelProps {
    employeeId: string
    employeeName: string
    open: boolean
    canEdit: boolean
}

interface EmployeeDocumentsModalProps {
    open: boolean
    employee: EmployeeRecord | null
    onClose: () => void
    canEdit: boolean
}

function EditEmployeeModal({ open, onClose, employee, setEmployee, canEdit, errors, setErrors, onSaved }: EditEmployeeModalProps) {
    const firstFieldRef = useRef<HTMLInputElement|null>(null)
    const dialogRef = useRef<HTMLDivElement|null>(null)
    const passwordInfo = useMemo(() => {
        if (!employee) return null
        return getPasswordInsights(employee.password, [employee.email, employee.firstName, employee.lastName])
    }, [employee])
    useEffect(()=>{ if(open && firstFieldRef.current) firstFieldRef.current.focus() }, [open])
    useEffect(()=>{
        if(!open) return
        const handler = (event: KeyboardEvent) => {
            if(event.key === 'Escape') { event.preventDefault(); onClose(); }
            if(event.key === 'Tab' && dialogRef.current) {
                const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )).filter(el => !el.hasAttribute('disabled'))
                if(focusables.length === 0) return
                const first = focusables[0]
                const last = focusables[focusables.length - 1]
                const currentIndex = focusables.indexOf(document.activeElement as HTMLElement)
                if(event.shiftKey) {
                    if(document.activeElement === first || currentIndex === -1) { event.preventDefault(); last.focus(); }
                } else {
                    if(document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            }
        }
        document.addEventListener('keydown', handler)
        return ()=> document.removeEventListener('keydown', handler)
    }, [open, onClose])
    if (!open || !employee) return null

    const local = { ...employee }
    const readOnly = !canEdit

    const validate = () => {
        const errs:string[] = []
        if (!local.firstName?.trim()) errs.push('Prénom requis')
        if (!local.lastName?.trim()) errs.push('Nom requis')
        if (!local.email?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) errs.push('Email invalide')
        setErrors(errs)
        return errs.length === 0
    }
    const handleChange = <Field extends keyof EmployeeRecord>(field: Field, value: EmployeeRecord[Field]) => {
        if (readOnly) return
        setEmployee((prev) => {
            if (!prev) return prev
            const next = { ...prev, [field]: value } as EmployeeRecord
            if (field === 'fullTime') {
                const fullTimeValue = Boolean(value)
                next.fullTime = fullTimeValue
                next.isFullTime = fullTimeValue
                return next
            }
            if (field === 'salary') {
                next.salary = value as EmployeeRecord['salary']
                next.annualSalary = value as EmployeeRecord['annualSalary']
                return next
            }
            return next
        })
    }
    const handlePermissionToggle = (section: AdminPermissionKey, field: 'enabled' | string, value: boolean) => {
        if (readOnly) return
        const normalizedField = resolvePermissionField(section, field)
        if (!normalizedField) return
        setEmployee((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                adminPermissions: applyPermissionToggle(prev.adminPermissions, section, normalizedField, value)
            }
        })
    }
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (readOnly) return onClose()
        if (!validate()) return
        const payload = { ...employee, id: employee.id }
        const res = await fetch('/api/admin/employees', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (res.ok) {
            const updatedPayload = (await res.json().catch(() => null)) as unknown
            const updatedEmployee = extractEmployee(updatedPayload)
            if (updatedEmployee) {
                onSaved(updatedEmployee)
            } else {
                setErrors(['Réponse inattendue du serveur'])
            }
        } else {
            const err = (await res.json().catch(() => null)) as { error?: string } | null
            setErrors([err?.error || 'Erreur mise à jour'])
        }
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true" aria-labelledby="edit-employee-title" ref={dialogRef}>
            <div className="sn-card w-full max-w-3xl" role="document">
                <div className="p-4 border-b flex justify-between items-center">
                    <div>
                        <h3 id="edit-employee-title" className="font-bold">{canEdit ? 'Modifier' : 'Détails du collaborateur'}</h3>
                        {employee.employeeNumber && (
                            <p className="text-xs text-slate-400">Matricule #{employee.employeeNumber}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800" aria-label="Fermer">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-auto" aria-describedby="edit-errors">
                    {errors.length > 0 && (
                        <div id="edit-errors" className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded" aria-live="polite">
                            <ul className="list-disc pl-4">
                                {errors.map((er: string, i: number)=><li key={i}>{er}</li>)}
                            </ul>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                        <span>Champs marqués <span className="font-semibold text-rose-500">*</span> obligatoires.</span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${employee.isActive === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {employee.isActive === false ? 'Compte archivé' : 'Compte actif'}
                        </span>
                    </div>
                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Identité" hint="Synchronisée avec les exports RH et les documents légaux." />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="flex items-center text-xs font-bold text-slate-500 mb-1" htmlFor="edit-firstName">
                                    Prénom
                                    <RequiredIndicator />
                                </label>
                                <input
                                    ref={firstFieldRef}
                                    id="edit-firstName"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.firstName || ''}
                                    onChange={e=>handleChange('firstName', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="flex items-center text-xs font-bold text-slate-500 mb-1" htmlFor="edit-lastName">
                                    Nom
                                    <RequiredIndicator />
                                </label>
                                <input
                                    id="edit-lastName"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.lastName || ''}
                                    onChange={e=>handleChange('lastName', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date de naissance</label>
                                <input
                                    type="date"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : ''}
                                    onChange={e=>handleChange('dateOfBirth', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Genre</label>
                                <select
                                    className="w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.gender || ''}
                                    onChange={e=>handleChange('gender', e.target.value)}
                                    disabled={readOnly}
                                >
                                    <option value="">Non précisé</option>
                                    <option value="F">Féminin</option>
                                    <option value="M">Masculin</option>
                                    <option value="NB">Non-binaire</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Contact" hint="Coordonnées partagées avec l'équipe et visibles dans les exports." />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="flex items-center text-xs font-bold text-slate-500 mb-1" htmlFor="edit-email">
                                    Email
                                    <RequiredIndicator />
                                </label>
                                <input
                                    id="edit-email"
                                    type="email"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.email || ''}
                                    onChange={e=>handleChange('email', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1" htmlFor="edit-phone">Téléphone</label>
                                <input
                                    id="edit-phone"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.phone || ''}
                                    onChange={e=>handleChange('phone', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1">Adresse</label>
                            <textarea
                                className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                value={employee.address || ''}
                                onChange={e=>handleChange('address', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Ville</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.city || ''}
                                    onChange={e=>handleChange('city', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Code postal</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.postalCode || ''}
                                    onChange={e=>handleChange('postalCode', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Pays</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.country || ''}
                                    onChange={e=>handleChange('country', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </section>

                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Contrat" hint="Statut RH, rattachement et informations liées au poste." />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Département</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.department || ''}
                                    onChange={e=>handleChange('department', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Poste</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.jobTitle || ''}
                                    onChange={e=>handleChange('jobTitle', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Date d&apos;embauche</label>
                                <input
                                    type="date"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.hireDate ? employee.hireDate.slice(0, 10) : ''}
                                    onChange={e=>handleChange('hireDate', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Temps de travail</label>
                                <select
                                    className="w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={(employee.fullTime ?? employee.isFullTime) ? 'FULL' : 'PART'}
                                    onChange={e=>handleChange('fullTime', e.target.value === 'FULL')}
                                    disabled={readOnly}
                                >
                                    <option value="FULL">Temps plein</option>
                                    <option value="PART">Temps partiel</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Statut</label>
                                <select
                                    className="w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.employmentStatus || 'PERMANENT'}
                                    onChange={e=>handleChange('employmentStatus', e.target.value)}
                                    disabled={readOnly}
                                >
                                    <option value="PERMANENT">Permanent</option>
                                    <option value="TEMPORARY">Temporaire</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Manager</label>
                                <input
                                    className="w-full rounded border bg-slate-100 p-2 text-slate-500"
                                    value={employee.manager ? `${employee.manager.firstName ?? ''} ${employee.manager.lastName ?? ''}`.trim() : '—'}
                                    disabled
                                />
                            </div>
                        </div>
                    </section>

                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Rémunération" hint="Champ visible uniquement par les SuperAdmin." />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Taux horaire (€)</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.hourlyRate ?? ''}
                                    onChange={e=>handleChange('hourlyRate', e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Salaire annuel (€)</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.salary ?? employee.annualSalary ?? ''}
                                    onChange={e=>handleChange('salary', e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                    </section>

                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Contact d'urgence" hint="Personne alertée en cas d'incident ou de problème médical." />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Nom</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.emergencyContactName || ''}
                                    onChange={e=>handleChange('emergencyContactName', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1">Téléphone</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.emergencyContactPhone || ''}
                                    onChange={e=>handleChange('emergencyContactPhone', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </section>

                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Notes internes" hint="Visible uniquement dans l'administration, non partagé avec l'employé." />
                        <textarea
                            className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                            value={employee.notes || ''}
                            onChange={e=>handleChange('notes', e.target.value)}
                            disabled={readOnly}
                        />
                    </section>

                    <section className={SECTION_CARD_CLASS}>
                        <SectionHeader title="Permissions back-office" hint="Activez les sections accessibles puis cochez les actions autorisées." />
                        <PermissionsEditor
                            permissions={employee.adminPermissions ?? createEmptyAdminPermissions()}
                            onToggle={handlePermissionToggle}
                            readOnly={!canEdit}
                        />
                    </section>

                    {canEdit && (
                        <section className={SECTION_CARD_CLASS}>
                            <SectionHeader title="Sécurité & accès" hint="Réinitialisez le mot de passe si besoin. Laissez vide pour conserver l'actuel." />
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500" htmlFor="edit-password">Nouveau mot de passe</label>
                                <input
                                    id="edit-password"
                                    type="password"
                                    className="w-full rounded border p-2"
                                    placeholder="Laisser vide pour ne rien changer"
                                    value={employee.password || ''}
                                    onChange={(event) => handleChange('password', event.target.value)}
                                    disabled={readOnly}
                                />
                                <PasswordStrengthIndicator info={passwordInfo} idleHint="12 caractères minimum recommandés." />
                            </div>
                        </section>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="border px-4 py-2 rounded">{readOnly ? 'Fermer' : 'Annuler'}</button>
                        {canEdit && (
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sauvegarder</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}

function EmployeeStatusModal({ open, mode, employee, onClose, onCompleted }: EmployeeStatusModalProps) {
    const [reason, setReason] = useState('')
    const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !employee) return
        setReason(mode === 'archive' ? employee.archiveReason ?? '' : '')
        setEffectiveDate(employee.employmentEndDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
        setSubmitting(false)
        setError(null)
    }, [open, employee, mode])

    if (!open || !employee) return null

    const title = mode === 'archive' ? `Archiver ${employee.firstName}` : `Réactiver ${employee.firstName}`
    const description =
        mode === 'archive'
            ? "Définissez la date de fin de contrat et précisez, si besoin, la raison de l'archivage."
            : 'Ajoutez une note interne expliquant la réactivation.'

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (submitting) return
        setSubmitting(true)
        setError(null)
        try {
            const payload =
                mode === 'archive'
                    ? {
                          employmentEndDate: effectiveDate || undefined,
                          reason: reason?.trim() ? reason.trim() : undefined
                      }
                    : {
                          note: reason?.trim() ? reason.trim() : undefined
                      }

            const endpoint = `/api/admin/employees/${employee.id}/${mode === 'archive' ? 'archive' : 'reactivate'}`
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = (await res.json().catch(() => null)) as { error?: string } | null
                setError(err?.error || 'Action impossible pour le moment.')
                return
            }

            const responsePayload = (await res.json().catch(() => null)) as unknown
            const updatedEmployee = extractEmployee(responsePayload)
            if (!updatedEmployee) {
                setError('Réponse inattendue du serveur.')
                return
            }
            onCompleted(updatedEmployee)
        } catch (caught) {
            console.error(caught)
            setError('Erreur réseau, veuillez réessayer.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true">
            <div className="sn-card w-full max-w-md" role="document">
                <div className="border-b p-4">
                    <h3 className="font-bold" id="employee-status-title">{title}</h3>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4" aria-describedby="employee-status-errors">
                    {error && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700" id="employee-status-errors">
                            {error}
                        </div>
                    )}
                    {mode === 'archive' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date de fin effective</label>
                            <input
                                type="date"
                                className="w-full rounded border p-2"
                                value={effectiveDate}
                                onChange={(event) => setEffectiveDate(event.target.value)}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                            {mode === 'archive' ? "Raison de l'archivage" : 'Note de réactivation'} (optionnel)
                        </label>
                        <textarea
                            className="w-full rounded border p-2"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            maxLength={240}
                            rows={3}
                        />
                        <p className="text-[11px] text-slate-400">240 caractères max.</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="border px-4 py-2 rounded" disabled={submitting}>
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className={`px-4 py-2 rounded text-white ${mode === 'archive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            disabled={submitting}
                        >
                            {submitting ? 'Patientez…' : mode === 'archive' ? 'Archiver' : 'Réactiver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
// Modal de création rapide
function CreateEmployeeModal({ open, onClose, onSubmit, form, setForm, myRole }: CreateEmployeeModalProps) {
    const passwordInfo = useMemo(
        () => getPasswordInsights(form.password, [form.email, form.firstName, form.lastName]),
        [form.password, form.email, form.firstName, form.lastName]
    )
    if (!open) return null
    const handlePermissionToggle = (section: AdminPermissionKey, field: 'enabled' | string, value: boolean) => {
        const normalizedField = resolvePermissionField(section, field)
        if (!normalizedField) return
        setForm((prev) => ({
            ...prev,
            permissions: applyPermissionToggle(prev.permissions, section, normalizedField, value)
        }))
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-slate-200">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">Nouveau collaborateur</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
                </div>
                <form onSubmit={onSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-auto">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Champs marqués <span className="font-semibold text-rose-500">*</span> obligatoires. Utilisez un mot de passe d&rsquo;au moins 12 caractères.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                                Prénom
                                <RequiredIndicator />
                            </label>
                            <input required className="w-full p-2 border rounded" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                                Nom
                                <RequiredIndicator />
                            </label>
                            <input required className="w-full p-2 border rounded" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                                Email
                                <RequiredIndicator />
                            </label>
                            <input required type="email" className="w-full p-2 border rounded" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                                Téléphone
                                <RequiredIndicator />
                            </label>
                            <input required className="w-full p-2 border rounded" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
                        <textarea className="w-full p-2 border rounded" value={form.address || ''} onChange={e=>setForm({...form, address: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Ville</label>
                            <input className="w-full p-2 border rounded" value={form.city || ''} onChange={e=>setForm({...form, city: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Code Postal</label>
                            <input className="w-full p-2 border rounded" value={form.postalCode || ''} onChange={e=>setForm({...form, postalCode: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pays</label>
                            <input className="w-full p-2 border rounded" value={form.country || ''} onChange={e=>setForm({...form, country: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date de Naissance</label>
                            <input type="date" className="w-full p-2 border rounded" value={form.dateOfBirth || ''} onChange={e=>setForm({...form, dateOfBirth: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Sexe</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.gender || ''} onChange={e=>setForm({...form, gender: e.target.value})}>
                                <option value="">—</option>
                                <option value="M">Homme</option>
                                <option value="F">Femme</option>
                                <option value="O">Autre</option>
                            </select>
                        </div>
                        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                            Le numéro employé est attribué automatiquement lors de l&apos;enregistrement.
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date d&apos;embauche</label>
                            <input type="date" className="w-full p-2 border rounded" value={form.hireDate || ''} onChange={e=>setForm({...form, hireDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Département</label>
                            <input className="w-full p-2 border rounded" value={form.department || ''} onChange={e=>setForm({...form, department: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Poste</label>
                            <input className="w-full p-2 border rounded" value={form.jobTitle || ''} onChange={e=>setForm({...form, jobTitle: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Statut</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.employmentStatus || 'PERMANENT'} onChange={e=>setForm({...form, employmentStatus: e.target.value})}>
                                <option value="PERMANENT">Permanent</option>
                                <option value="TEMPORARY">Temporaire</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                                <input type="checkbox" checked={!!form.fullTime} onChange={e=>setForm({...form, fullTime: e.target.checked})} />
                                Temps plein
                            </label>
                        </div>
                        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                            Le manager assigné correspond automatiquement à l&apos;utilisateur créant la fiche.
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Taux horaire (€)</label>
                            <input className="w-full p-2 border rounded" value={form.hourlyRate || ''} onChange={e=>setForm({...form, hourlyRate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Salaire annuel (€)</label>
                            <input className="w-full p-2 border rounded" value={form.salary || ''} onChange={e=>setForm({...form, salary: e.target.value})} disabled={myRole !== 'SUPERADMIN'} />
                            {myRole !== 'SUPERADMIN' && (
                                <p className="text-[11px] text-slate-500 mt-1">Visible et éditable uniquement par le SuperAdmin.</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Contact Urgence - Nom</label>
                            <input className="w-full p-2 border rounded" value={form.emergencyContactName || ''} onChange={e=>setForm({...form, emergencyContactName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Contact Urgence - Téléphone</label>
                            <input className="w-full p-2 border rounded" value={form.emergencyContactPhone || ''} onChange={e=>setForm({...form, emergencyContactPhone: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                        <textarea className="w-full p-2 border rounded" value={form.notes || ''} onChange={e=>setForm({...form, notes: e.target.value})} />
                    </div>

                    <section className="space-y-3 border border-slate-100 rounded-xl p-3">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Permissions back-office</h4>
                            <p className="text-xs text-slate-500">Activez les pages accessibles pour ce compte puis cochez les actions autorisées.</p>
                        </div>
                        <PermissionsEditor permissions={form.permissions} onToggle={handlePermissionToggle} />
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                                Mot de passe provisoire
                                <RequiredIndicator />
                            </label>
                            <input
                                required
                                type="password"
                                className="w-full p-2 border rounded"
                                value={form.password || ''}
                                onChange={e=>setForm({...form, password: e.target.value})}
                                placeholder="12 caractères minimum"
                            />
                            <PasswordStrengthIndicator info={passwordInfo} idleHint="Évitez les mots du dictionnaire et ajoutez des chiffres." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rôle</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.role} onChange={e => setForm({...form, role: e.target.value})} disabled={myRole === 'ADMIN'}>
                                <option value="EMPLOYEE">Employé</option>
                                {myRole === 'SUPERADMIN' && <option value="ADMIN">Administrateur</option>}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="border px-4 py-2 rounded">Annuler</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Créer</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export function EmployeeDirectory({ employees, loading }: EmployeeDirectoryProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const directoryFilter = parseDirectoryFilter(searchParams.get(DIRECTORY_FILTER_QUERY_KEY))

    if (loading) {
        return <div className="sn-card p-8 text-center text-sm text-slate-500">Chargement...</div>
    }
    if (employees.length === 0) {
        return <div className="sn-card p-8 text-center text-sm text-slate-500">Aucun collaborateur pour l&apos;instant.</div>
    }

    const activeCount = employees.filter((emp) => emp.isActive !== false).length
    const archivedCount = employees.filter((emp) => emp.isActive === false).length
    const filteredEmployees = employees.filter((emp) => {
        if (directoryFilter === 'active') return emp.isActive !== false
        if (directoryFilter === 'inactive') return emp.isActive === false
        return true
    })

    const filters: Array<{ value: DirectoryFilter; label: string; count: number }> = [
        { value: 'active', label: 'Actifs', count: activeCount },
        { value: 'inactive', label: 'Archivés', count: archivedCount },
        { value: 'all', label: 'Tous', count: employees.length }
    ]

    const handleFilterChange = (nextFilter: DirectoryFilter) => {
        if (nextFilter === directoryFilter) return
        const params = new URLSearchParams(searchParams.toString())
        if (nextFilter === 'active') {
            params.delete(DIRECTORY_FILTER_QUERY_KEY)
        } else {
            params.set(DIRECTORY_FILTER_QUERY_KEY, nextFilter)
        }
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        onClick={() => handleFilterChange(filter.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            directoryFilter === filter.value
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                        }`}
                    >
                        {filter.label} · {filter.count}
                    </button>
                ))}
            </div>
            {filteredEmployees.length === 0 ? (
                <div className="sn-card p-8 text-center text-sm text-slate-500">
                    {directoryFilter === 'inactive'
                        ? 'Aucun compte archivé à afficher.'
                        : 'Aucun collaborateur actif pour cette vue.'}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredEmployees.map((emp) => {
                        const displayRole = emp.role ?? 'EMPLOYEE'
                        return (
                            <article key={emp.id} className="sn-card flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">
                                        {emp.image ? (
                                            <Image src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} width={48} height={48} className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {emp.firstName} {emp.lastName}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                                            <span className={`rounded-full px-2 py-0.5 border ${
                                                displayRole === 'SUPERADMIN'
                                                    ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                                                    : displayRole === 'ADMIN'
                                                    ? 'border-purple-200 bg-purple-100 text-purple-700'
                                                    : 'border-blue-200 bg-blue-100 text-blue-700'
                                            }`}>
                                                {displayRole}
                                            </span>
                                            {emp.employeeNumber && (
                                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500">
                                                    #{emp.employeeNumber}
                                                </span>
                                            )}
                                            {emp.jobTitle && (
                                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500">
                                                    {emp.jobTitle}
                                                </span>
                                            )}
                                            {emp.isActive === false && (
                                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                                                    Archivé
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                    <div className="flex items-center gap-2"><span aria-hidden="true">📧</span><span>{emp.email}</span></div>
                                    {emp.phone && <div className="flex items-center gap-2"><span aria-hidden="true">📞</span><span>{emp.phone}</span></div>}
                                    {emp.manager && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <span aria-hidden="true">👤</span>
                                            <span>Manager : {emp.manager.firstName ?? ''} {emp.manager.lastName ?? ''}</span>
                                        </div>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

interface PermissionsEditorProps {
    permissions: AdminPermissions
    onToggle: (section: AdminPermissionKey, field: 'enabled' | string, value: boolean) => void
    readOnly?: boolean
}

function PermissionsEditor({ permissions, onToggle, readOnly = false }: PermissionsEditorProps) {
    return (
        <div className="space-y-4">
            {PERMISSION_GROUPED_SECTIONS.map((group) => (
                <section key={group.key} className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">{group.label}</h5>
                    <div className="space-y-3">
                        {group.sections.map(({ key, config }) => {
                            const page = permissions[key]
                            return (
                                <div key={key} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">{config.label}</p>
                                            {config.description && <p className="text-xs text-slate-500">{config.description}</p>}
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={page.enabled}
                                                disabled={readOnly}
                                                onChange={(event) => onToggle(key, 'enabled', event.target.checked)}
                                            />
                                            Accès autorisé
                                        </label>
                                    </div>
                                    {config.actions.length > 0 && (
                                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                                            {config.actions.map((action) => (
                                                <label key={action.key} className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 h-4 w-4"
                                                        checked={page.enabled && Boolean(page[action.key as keyof typeof page])}
                                                        disabled={readOnly || !page.enabled}
                                                        onChange={(event) => onToggle(key, action.key, event.target.checked)}
                                                    />
                                                    <span>
                                                        <span className="font-semibold text-slate-700">{action.label}</span>
                                                        {action.description && (
                                                            <span className="block text-[11px] text-slate-400">{action.description}</span>
                                                        )}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            ))}
        </div>
    )
}
