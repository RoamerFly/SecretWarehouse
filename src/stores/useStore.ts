import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/tauri'
import { SecretEntry, CreateSecretRequest, UpdateSecretRequest } from '../types'

interface AppState {
  // State
  secrets: SecretEntry[]
  selectedSecret: SecretEntry | null
  allTags: string[]  // 所有标签
  selectedTag: string | null  // 选中的标签筛选
  searchQuery: string
  isLoading: boolean
  error: string | null
  showForm: boolean
  editingSecret: SecretEntry | null

  // Actions
  fetchSecrets: (tag?: string) => Promise<void>
  fetchAllTags: () => Promise<void>
  createSecret: (req: CreateSecretRequest) => Promise<void>
  updateSecret: (req: UpdateSecretRequest) => Promise<SecretEntry>
  deleteSecret: (id: string) => Promise<void>
  searchSecrets: (query: string) => Promise<void>
  selectSecret: (secret: SecretEntry | null) => void
  selectTag: (tag: string | null) => void
  setSearchQuery: (query: string) => void
  setShowForm: (show: boolean) => void
  setEditingSecret: (secret: SecretEntry | null) => void
  generatePassword: (length?: number) => Promise<string>
}

export const useStore = create<AppState>((set, get) => ({
  secrets: [],
  selectedSecret: null,
  allTags: [],
  selectedTag: null,
  searchQuery: '',
  isLoading: false,
  error: null,
  showForm: false,
  editingSecret: null,

  fetchSecrets: async (tag?: string) => {
    set({ isLoading: true, error: null })
    try {
      // 处理收藏夹筛选
      const isFavorite = tag === 'favorite'
      const secrets = await invoke<SecretEntry[]>('list_secrets', {
        tag: isFavorite ? null : (tag || null),
        favorite: isFavorite ? true : null,
        limit: null,
        offset: null,
      })
      set({ secrets, isLoading: false })
      // 更新所有标签
      get().fetchAllTags()
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

  createSecret: async (req: CreateSecretRequest) => {
    set({ isLoading: true, error: null })
    try {
      console.log('Creating secret with:', req)
      const secret = await invoke<SecretEntry>('create_secret', {
        title: req.title,
        fields: req.fields,
        tags: req.tags || null,
        icon: req.icon || 'key',
      })
      console.log('Created secret:', secret)
      set((state) => ({
        secrets: [secret, ...state.secrets],
        isLoading: false,
        showForm: false,
        editingSecret: null,
      }))
      get().fetchAllTags()
    } catch (err) {
      console.error('Create secret error:', err)
      set({ error: String(err), isLoading: false })
    }
  },

  updateSecret: async (req: UpdateSecretRequest) => {
    set({ isLoading: true, error: null })
    try {
      const secret = await invoke<SecretEntry>('update_secret', {
        id: req.id,
        title: req.title || null,
        fields: req.fields || null,
        tags: req.tags || null,
        icon: req.icon || null,
        favorite: req.favorite !== undefined ? req.favorite : null,
      })
      // 只更新 secrets 列表，不更新 selectedSecret
      // selectedSecret 会在 SecretDetail 的 effect 中自动同步
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

  searchSecrets: async (query: string) => {
    if (!query.trim()) {
      set({ searchQuery: '' })
      get().fetchSecrets(get().selectedTag || undefined)
      return
    }
    set({ isLoading: true, error: null, searchQuery: query })
    try {
      const secrets = await invoke<SecretEntry[]>('search_secrets', { query })
      // 只有当搜索词仍然是当前查询时才更新结果（防止竞态条件）
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
    set({ selectedTag: tag })
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
}))
