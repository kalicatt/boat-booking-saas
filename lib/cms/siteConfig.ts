import { Prisma, type SiteConfig } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  SITE_CONFIG_GROUPS,
  type SiteConfigFieldDefinition,
  type SiteConfigGroupState
} from './siteConfigDefinitions'
import { normalizeTranslationRecord, type TranslationRecord } from '@/types/cms'

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }
  return null
}

const getSingleValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  const record = asRecord(value)
  if (record && typeof record.value === 'string') {
    return record.value
  }
  return ''
}

const getStoredTranslation = (value: unknown): TranslationRecord => {
  return normalizeTranslationRecord(value)
}

const serializeValue = (definition: SiteConfigFieldDefinition, value: unknown) => {
  if (definition.translatable) {
    return getStoredTranslation(value)
  }
  return getSingleValue(value)
}

const buildFieldState = (
  definition: SiteConfigFieldDefinition,
  record?: SiteConfig | null
) => {
  const draft = record?.draftValues ?? record?.publishedValues
  return {
    ...definition,
    value: serializeValue(definition, draft)
  }
}

export const getSiteConfigGroups = async (): Promise<SiteConfigGroupState[]> => {
  const existing = await prisma.siteConfig.findMany()
  const map = new Map(existing.map((entry) => [entry.key, entry]))

  return SITE_CONFIG_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description,
    fields: group.fields.map((field) => buildFieldState(field, map.get(field.key)))
  }))
}

const preparePersistValue = (
  definition: SiteConfigFieldDefinition,
  value: unknown
): { serialized: Prisma.InputJsonValue; normalized: TranslationRecord | string } => {
  if (definition.translatable) {
    const normalized = getStoredTranslation(value)
    return { serialized: normalized, normalized }
  }
  const stringValue = typeof value === 'string' ? value.trim() : ''
  return { serialized: { value: stringValue }, normalized: stringValue }
}

export const upsertSiteConfigEntries = async (
  entries: Array<{
    definition: SiteConfigFieldDefinition
    value: unknown
  }>
) => {
  const operations = entries.map(({ definition, value }) => {
    const { serialized } = preparePersistValue(definition, value)
    return prisma.siteConfig.upsert({
      where: { key: definition.key },
      update: {
        label: definition.label,
        type: definition.type,
        group: definition.key.split('.')[0] ?? 'default',
        draftValues: serialized
      },
      create: {
        key: definition.key,
        label: definition.label,
        type: definition.type,
        group: definition.key.split('.')[0] ?? 'default',
        publishedValues: serialized,
        draftValues: serialized
      }
    })
  })

  await prisma.$transaction(operations)
}

