import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { Key, Lock, Star, Eye, CheckSquare, Square, Trash2, X } from 'lucide-react'
import { iconMap, iconColors } from '../constants/icons'
import { SecretEntry } from '../types'

export default function SecretList() {
  const {
    secrets, selectSecret, isLoading,
    isSelectionMode, selectedIds, toggleSelection,
    selectAll, clearSelection, deleteSecrets, settings
  } = useStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Get card size settings
  const cardGapClass = {
    compact: 'gap-3',
    normal: 'gap-4',
    comfortable: 'gap-5',
  }[settings.cardSize]

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 0, height: '100%' }}>
        {secrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-base font-medium text-slate-600 dark:text-slate-400 mb-1">暂无条目</p>
            <p className="text-sm text-slate-500">点击"新增条目"开始添加</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${cardGapClass}`}>
            {secrets.map((secret, index) => (
              <SecretCard
                key={secret.id}
                secret={secret}
                index={index}
                isSelected={selectedIds.has(secret.id)}
                isSelectionMode={isSelectionMode}
                onDoubleClick={handleDoubleClick}
                onClick={handleCardClick}
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
}

function SecretCard({ secret, index, isSelected, isSelectionMode, onDoubleClick, onClick }: SecretCardProps) {
  const Icon = iconMap[secret.icon] || Key
  const gradientColor = iconColors[secret.icon] || 'from-yellow-400 to-amber-500'
  const preview = getPreview(secret.fields, secret.sensitiveFields)
  const settings = useStore((s) => s.settings)

  // Card padding based on settings
  const cardPaddingClass = {
    compact: 'p-3',
    normal: 'p-4',
    comfortable: 'p-5',
  }[settings.cardSize]

  // Icon size based on settings
  const iconSizeClass = {
    compact: 'w-8 h-8',
    normal: 'w-10 h-10',
    comfortable: 'w-12 h-12',
  }[settings.cardSize]

  const iconInnerSize = {
    compact: 'w-4 h-4',
    normal: 'w-5 h-5',
    comfortable: 'w-6 h-6',
  }[settings.cardSize]

  return (
    <div
      onDoubleClick={() => onDoubleClick(secret)}
      onClick={() => onClick(secret)}
      className={`group bg-white dark:bg-slate-800 rounded-2xl ${cardPaddingClass} border transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
        isSelected
          ? 'border-violet-500 dark:border-violet-500 shadow-lg shadow-violet-500/20'
          : 'border-slate-200/80 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
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

        <div className={`${iconSizeClass} rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`${iconInnerSize} text-white`} />
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
        {!isSelectionMode && (
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
