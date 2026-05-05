import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/tauri'
import { SecretEntry, CreateSecretRequest, UpdateSecretRequest, Template, CreateTemplateRequest, UpdateTemplateRequest } from '../types'

interface AppSettings {
  fontSize: 'small' | 'medium' | 'large'
  cardSize: 'compact' | 'normal' | 'comfortable'
  spacing: 'tight' | 'normal' | 'relaxed'
}

const defaultSettings: AppSettings = {
  fontSize: 'medium',
  cardSize: 'normal',
  spacing: 'normal',
}

// Load settings from localStorage
const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('secret-warehouse-settings')
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return defaultSettings
}

// Save settings to localStorage
const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem('secret-warehouse-settings', JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

interface AppState {
  // State
  secrets: SecretEntry[]
  selectedSecret: SecretEntry | null
  allTags: string[]  // 所有标签
  tagCounts: Record<string, number>  // 标签计数
  selectedTag: string | null  // 选中的标签筛选
  searchQuery: string
  isLoading: boolean
  error: string | null
  showForm: boolean
  editingSecret: SecretEntry | null

  // Multi-select
  selectedIds: Set<string>
  isSelectionMode: boolean

  // Templates
  templates: Template[]
  showTemplates: boolean
  showTemplateForm: boolean
  editingTemplate: Template | null

  // Settings
  showSettings: boolean
  settings: AppSettings

  // Actions
  fetchSecrets: (tag?: string) => Promise<void>
  fetchAllTags: () => Promise<void>
  fetchTagCounts: () => Promise<void>
  createSecret: (req: CreateSecretRequest) => Promise<void>
  updateSecret: (req: UpdateSecretRequest) => Promise<SecretEntry>
  deleteSecret: (id: string) => Promise<void>
  deleteSecrets: (ids: string[]) => Promise<number>
  searchSecrets: (query: string) => Promise<void>
  selectSecret: (secret: SecretEntry | null) => void
  selectTag: (tag: string | null) => void
  setSearchQuery: (query: string) => void
  setShowForm: (show: boolean) => void
  setEditingSecret: (secret: SecretEntry | null) => void
  generatePassword: (length?: number) => Promise<string>
  generateTestData: () => Promise<number>

  // Multi-select actions
  toggleSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setSelectionMode: (mode: boolean) => void

  // Template actions
  fetchTemplates: () => Promise<void>
  createTemplate: (req: CreateTemplateRequest) => Promise<void>
  updateTemplate: (req: UpdateTemplateRequest) => Promise<Template>
  deleteTemplate: (id: string) => Promise<void>
  setShowTemplates: (show: boolean) => void
  setShowTemplateForm: (show: boolean) => void
  setEditingTemplate: (template: Template | null) => void

  // Settings actions
  setShowSettings: (show: boolean) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  resetSettings: () => void
}

export const useStore = create<AppState>((set, get) => ({
  secrets: [],
  selectedSecret: null,
  allTags: [],
  tagCounts: {},
  selectedTag: null,
  searchQuery: '',
  isLoading: false,
  error: null,
  showForm: false,
  editingSecret: null,

  // Multi-select
  selectedIds: new Set(),
  isSelectionMode: false,

  // Templates
  templates: [],
  showTemplates: false,
  showTemplateForm: false,
  editingTemplate: null,

  // Settings
  showSettings: false,
  settings: loadSettings(),

  fetchSecrets: async (tag?: string) => {
    set({ isLoading: true, error: null })
    try {
      const isFavorite = tag === 'favorite'
      const secrets = await invoke<SecretEntry[]>('list_secrets', {
        tag: isFavorite ? null : (tag || null),
        favorite: isFavorite ? true : null,
        limit: null,
        offset: null,
      })
      set({ secrets, isLoading: false, selectedIds: new Set(), isSelectionMode: false })
      get().fetchAllTags()
      get().fetchTagCounts()
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  fetchAllTags: async () => {
    try {
      const tags = await invoke<string[]>('get_all_tags')
      set({ allTags: tags })
    } catch (err) {
      console.error('Failed to fetch tags:', err)
    }
  },

  fetchTagCounts: async () => {
    try {
      const counts = await invoke<Record<string, number>>('get_tag_counts')
      set({ tagCounts: counts })
    } catch (err) {
      console.error('Failed to fetch tag counts:', err)
    }
  },

  createSecret: async (req: CreateSecretRequest) => {
    set({ isLoading: true, error: null })
    try {
      const secret = await invoke<SecretEntry>('create_secret', {
        title: req.title,
        description: req.description || '',
        fields: req.fields,
        sensitiveFields: req.sensitiveFields || null,
        tags: req.tags || null,
        icon: req.icon || 'key',
      })
      set((state) => ({
        secrets: [secret, ...state.secrets],
        isLoading: false,
        showForm: false,
        editingSecret: null,
      }))
      get().fetchAllTags()
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  updateSecret: async (req: UpdateSecretRequest) => {
    set({ isLoading: true, error: null })
    try {
      const secret = await invoke<SecretEntry>('update_secret', {
        id: req.id,
        title: req.title || null,
        description: req.description || null,
        fields: req.fields || null,
        sensitiveFields: req.sensitiveFields || null,
        tags: req.tags || null,
        icon: req.icon || null,
        favorite: req.favorite !== undefined ? req.favorite : null,
      })
      set((state) => ({
        secrets: state.secrets.map((s) => (s.id === secret.id ? secret : s)),
        isLoading: false,
      }))
      get().fetchAllTags()
      return secret
    } catch (err) {
      set({ error: String(err), isLoading: false })
      throw err
    }
  },

  deleteSecret: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await invoke<boolean>('delete_secret', { id })
      set((state) => ({
        secrets: state.secrets.filter((s) => s.id !== id),
        selectedSecret: state.selectedSecret?.id === id ? null : state.selectedSecret,
        isLoading: false,
      }))
      get().fetchAllTags()
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  deleteSecrets: async (ids: string[]) => {
    set({ isLoading: true, error: null })
    try {
      const count = await invoke<number>('delete_secrets', { ids })
      set((state) => ({
        secrets: state.secrets.filter((s) => !ids.includes(s.id)),
        selectedSecret: ids.includes(state.selectedSecret?.id || '') ? null : state.selectedSecret,
        selectedIds: new Set(),
        isSelectionMode: false,
        isLoading: false,
      }))
      get().fetchAllTags()
      return count
    } catch (err) {
      set({ error: String(err), isLoading: false })
      throw err
    }
  },

  searchSecrets: async (query: string) => {
    if (!query.trim()) {
      set({ searchQuery: '' })
      get().fetchSecrets(get().selectedTag || undefined)
      return
    }
    set({ isLoading: true, error: null, searchQuery: query })
    try {
      const secrets = await invoke<SecretEntry[]>('search_secrets', { query })
      if (get().searchQuery === query) {
        set({ secrets, isLoading: false })
      }
    } catch (err) {
      if (get().searchQuery === query) {
        set({ error: String(err), isLoading: false })
      }
    }
  },

  selectSecret: (secret) => set({ selectedSecret: secret }),

  selectTag: (tag) => {
    set({ selectedTag: tag, searchQuery: '' })
    get().fetchSecrets(tag || undefined)
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShowForm: (show) => set({ showForm: show, editingSecret: show ? get().editingSecret : null }),

  setEditingSecret: (secret) => set({ editingSecret: secret, showForm: secret !== null }),

  generatePassword: async (length = 16) => {
    try {
      return await invoke<string>('generate_password', { length })
    } catch (err) {
      throw new Error(String(err))
    }
  },

  generateTestData: async () => {
    set({ isLoading: true, error: null })
    try {
      const count = await invoke<number>('generate_test_data')
      await get().fetchSecrets()
      set({ isLoading: false })
      return count
    } catch (err) {
      set({ error: String(err), isLoading: false })
      throw err
    }
  },

  // Multi-select actions
  toggleSelection: (id) => set((state) => {
    const newSet = new Set(state.selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    return { selectedIds: newSet, isSelectionMode: newSet.size > 0 || state.isSelectionMode }
  }),

  selectAll: () => set((state) => ({
    selectedIds: new Set(state.secrets.map(s => s.id)),
    isSelectionMode: true,
  })),

  clearSelection: () => set({ selectedIds: new Set(), isSelectionMode: false }),

  setSelectionMode: (mode) => set({ isSelectionMode: mode, selectedIds: mode ? get().selectedIds : new Set() }),

  // Template actions
  fetchTemplates: async () => {
    try {
      const templates = await invoke<Template[]>('list_templates')
      set({ templates })
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  },

  createTemplate: async (req: CreateTemplateRequest) => {
    set({ isLoading: true, error: null })
    try {
      const template = await invoke<Template>('create_template', {
        name: req.name,
        description: req.description || '',
        fields: req.fields,
        tags: req.tags || null,
        icon: req.icon || 'key',
      })
      set((state) => ({
        templates: [template, ...state.templates],
        isLoading: false,
        showTemplateForm: false,
        editingTemplate: null,
      }))
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  updateTemplate: async (req: UpdateTemplateRequest) => {
    set({ isLoading: true, error: null })
    try {
      const template = await invoke<Template>('update_template', {
        id: req.id,
        name: req.name || null,
        description: req.description || null,
        fields: req.fields || null,
        tags: req.tags || null,
        icon: req.icon || null,
      })
      set((state) => ({
        templates: state.templates.map((t) => (t.id === template.id ? template : t)),
        isLoading: false,
      }))
      return template
    } catch (err) {
      set({ error: String(err), isLoading: false })
      throw err
    }
  },

  deleteTemplate: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await invoke<boolean>('delete_template', { id })
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        isLoading: false,
      }))
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  setShowTemplates: (show) => set({ showTemplates: show }),

  setShowTemplateForm: (show) => set({ showTemplateForm: show, editingTemplate: show ? get().editingTemplate : null }),

  setEditingTemplate: (template) => set({ editingTemplate: template, showTemplateForm: template !== null }),

  // Settings actions
  setShowSettings: (show) => set({ showSettings: show }),

  updateSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial }
    saveSettings(newSettings)
    set({ settings: newSettings })
  },

  resetSettings: () => {
    saveSettings(defaultSettings)
    set({ settings: defaultSettings })
  },
}))
