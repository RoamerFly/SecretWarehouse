import { useState, useMemo } from 'react'
import { useStore } from '../stores/useStore'
import { Key, Lock, Star, Eye, CheckSquare, Square, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { iconMap, iconColors } from '../constants/icons'
import { SecretEntry } from '../types'

export default function SecretList() {
  const {
    secrets, selectSecret, isLoading,
    isSelectionMode, selectedIds, toggleSelection,
    selectAll, clearSelection, deleteSecrets, settings,
    passwordCheckMode, updateSettings
  } = useStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Calculate password strength for all secrets when password check mode is enabled
  const passwordStrengthMap = useMemo(() => {
    const map = new Map<string, string>()
    if (passwordCheckMode) {
      const keywords = settings.passwordCheckKeywords || ['密码', 'password', '口令', 'PIN']
      secrets.forEach(secret => {
        Object.entries(secret.fields).forEach(([key, value]) => {
          const matchesKeyword = keywords.some(keyword =>
            key.toLowerCase().includes(keyword.toLowerCase())
          )
          if (matchesKeyword) {
            const strength = calculatePasswordStrength(value)
            const existing = map.get(secret.id)
            // Keep the weakest strength if there are multiple passwords
            if (!existing || getStrengthPriority(strength) < getStrengthPriority(existing)) {
              map.set(secret.id, strength)
            }
          }
        })
      })
    }
    return map
  }, [secrets, passwordCheckMode, settings.passwordCheckKeywords])

  // Helper function to compare by sort settings
  const compareBySortSettings = (a: SecretEntry, b: SecretEntry) => {
    const { sortField, sortDirection } = settings
    const multiplier = sortDirection === 'asc' ? 1 : -1
    let comparison = 0
    switch (sortField) {
      case 'updated_at':
        comparison = a.updated_at - b.updated_at
        break
      case 'created_at':
        comparison = a.created_at - b.created_at
        break
      case 'title':
        comparison = a.title.localeCompare(b.title, 'zh-CN')
        break
      case 'fields_count':
        comparison = Object.keys(a.fields).length - Object.keys(b.fields).length
        break
    }
    return comparison * multiplier
  }

  // Sort secrets
  const filteredSecrets = useMemo(() => {
    const sorted = [...secrets]

    if (passwordCheckMode) {
      // Password check mode: items with detection first, then without
      const withDetection: SecretEntry[] = []
      const withoutDetection: SecretEntry[] = []

      sorted.forEach(secret => {
        if (passwordStrengthMap.has(secret.id)) {
          withDetection.push(secret)
        } else {
          withoutDetection.push(secret)
        }
      })

      // Sort detected items: first by strength (weak first), then by user's sort settings
      withDetection.sort((a, b) => {
        const strengthA = passwordStrengthMap.get(a.id)!
        const strengthB = passwordStrengthMap.get(b.id)!
        const strengthDiff = getStrengthPriority(strengthA) - getStrengthPriority(strengthB)
        if (strengthDiff !== 0) return strengthDiff
        // Same strength, sort by user's settings
        return compareBySortSettings(a, b)
      })

      // Sort undetected items by normal sort settings
      withoutDetection.sort(compareBySortSettings)

      return [...withDetection, ...withoutDetection]
    } else {
      // Normal mode: sort by settings
      sorted.sort(compareBySortSettings)
      return sorted
    }
  }, [secrets, passwordCheckMode, passwordStrengthMap, settings.sortField, settings.sortDirection])

  const handleDoubleClick = (secret: SecretEntry) => {
    if (!isSelectionMode) {
      selectSecret(secret)
    }
  }

  const handleCardClick = (secret: SecretEntry) => {
    if (isSelectionMode) {
      toggleSelection(secret.id)
    }
  }

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length > 0) {
      await deleteSecrets(ids)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col overflow-hidden">
      {/* Selection toolbar */}
      {isSelectionMode && (
        <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={clearSelection}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            已选择 {selectedIds.size} 项
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              全选
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              删除选中
            </button>
          </div>
        </div>
      )}

      {/* Sort toolbar */}
      <div className="px-6 py-2 bg-white/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>{getSortLabel(settings.sortField)}</span>
            {settings.sortDirection === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
          </button>
          {showSortMenu && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
              {[
                { field: 'updated_at' as const, label: '更新时间' },
                { field: 'created_at' as const, label: '创建时间' },
                { field: 'title' as const, label: '标题名称' },
                { field: 'fields_count' as const, label: '字段个数' },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => {
                    if (settings.sortField === field) {
                      updateSettings({ sortDirection: settings.sortDirection === 'asc' ? 'desc' : 'asc' })
                    } else {
                      updateSettings({ sortField: field })
                    }
                    setShowSortMenu(false)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    settings.sortField === field
                      ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{label}</span>
                  {settings.sortField === field && (
                    settings.sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {filteredSecrets.length} 个条目
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 0, height: '100%' }}>
        {filteredSecrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-base font-medium text-slate-600 dark:text-slate-400 mb-1">
              暂无条目
            </p>
            <p className="text-sm text-slate-500">
              点击"新增条目"开始添加
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: `${settings.spacing}px` }}>
            {filteredSecrets.map((secret, index) => (
              <SecretCard
                key={secret.id}
                secret={secret}
                index={index}
                isSelected={selectedIds.has(secret.id)}
                isSelectionMode={isSelectionMode}
                onDoubleClick={handleDoubleClick}
                onClick={handleCardClick}
                passwordStrength={passwordCheckMode ? passwordStrengthMap.get(secret.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">确认删除</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              确定要删除选中的 {selectedIds.size} 个条目吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium transition-colors hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SecretCardProps {
  secret: SecretEntry
  index: number
  isSelected: boolean
  isSelectionMode: boolean
  onDoubleClick: (secret: SecretEntry) => void
  onClick: (secret: SecretEntry) => void
  passwordStrength?: string
}

function SecretCard({ secret, index, isSelected, isSelectionMode, onDoubleClick, onClick, passwordStrength }: SecretCardProps) {
  const Icon = iconMap[secret.icon] || Key
  const gradientColor = iconColors[secret.icon] || 'from-yellow-400 to-amber-500'
  const preview = getPreview(secret.fields, secret.sensitiveFields)
  const settings = useStore((s) => s.settings)

  return (
    <div
      onDoubleClick={() => onDoubleClick(secret)}
      onClick={() => onClick(secret)}
      className={`group bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 relative ${
        isSelected
          ? 'border-violet-500 dark:border-violet-500 shadow-lg shadow-violet-500/20'
          : 'border-slate-200/80 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10'
      }`}
      style={{ animationDelay: `${index * 50}ms`, padding: `${settings.cardSize / 4}px` }}
    >
      {/* Password Strength Badge */}
      {passwordStrength && (
        <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-semibold ${getStrengthColor(passwordStrength)}`}>
          {passwordStrength}
        </div>
      )}

      <div className="flex items-start" style={{ gap: `${settings.spacing}px` }}>
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div className="flex-shrink-0 pt-1">
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-violet-500" />
            ) : (
              <Square className="w-5 h-5 text-slate-400" />
            )}
          </div>
        )}

        <div
          className={`rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
          style={{ width: `${settings.cardSize}px`, height: `${settings.cardSize}px` }}
        >
          <span style={{ width: `${settings.cardSize / 2}px`, height: `${settings.cardSize / 2}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon className="text-white w-full h-full" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{secret.title}</h3>
            {secret.favorite && (
              <Star className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />
            )}
          </div>
          {preview && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">{preview}</p>
          )}
        </div>
        {!isSelectionMode && !passwordStrength && (
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <Eye className="w-4 h-4 text-violet-500" />
          </div>
        )}
      </div>

      {/* Description */}
      {secret.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
          {secret.description}
        </p>
      )}

      {secret.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {secret.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-xs font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-md">
              #{tag}
            </span>
          ))}
          {secret.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs font-medium text-slate-400">+{secret.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/30">
        <span className="text-xs text-slate-400">
          {Object.keys(secret.fields).length} 个字段
        </span>
        <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
        <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
          {isSelectionMode ? '点击选择' : '双击查看详情'}
        </span>
      </div>
    </div>
  )
}

function getPreview(fields: Record<string, string>, sensitiveFields: string[] = []): string {
  for (const [key, value] of Object.entries(fields)) {
    if (value && !sensitiveFields.includes(key)) {
      return value.length > 30 ? value.substring(0, 30) + '...' : value
    }
  }
  return ''
}

function calculatePasswordStrength(password: string): string {
  if (!password) return '无密码'

  let score = 0

  // Length scoring
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  // Character variety
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  // Determine strength
  if (score <= 2) return '弱'
  if (score <= 4) return '中'
  if (score <= 6) return '强'
  return '非常强'
}

function getStrengthColor(strength: string) {
  switch (strength) {
    case '弱': return 'text-red-500 bg-red-100 dark:bg-red-900/30'
    case '中': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
    case '强': return 'text-green-500 bg-green-100 dark:bg-green-900/30'
    case '非常强': return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
    default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30'
  }
}

function getStrengthPriority(strength: string): number {
  switch (strength) {
    case '弱': return 0
    case '中': return 1
    case '强': return 2
    case '非常强': return 3
    default: return 4
  }
}

function getSortLabel(field: string): string {
  switch (field) {
    case 'updated_at': return '更新时间'
    case 'created_at': return '创建时间'
    case 'title': return '标题名称'
    case 'fields_count': return '字段个数'
    default: return '排序'
  }
}
