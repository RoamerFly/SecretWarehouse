import { useEffect } from 'react'
import { useState } from 'react'
import { useStore } from '../stores/useStore'
import {
  Key, Lock, Star, Eye, EyeOff, Copy, Edit,
  Trash2, Clock, CheckCircle2,
} from 'lucide-react'
import { iconMap, iconColors } from '../constants/icons'

const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

export default function SecretDetail() {
  const { selectedSecret, secrets, selectSecret, updateSecret, deleteSecret, setEditingSecret } = useStore()
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 当 secrets 更新时，同步 selectedSecret
  useEffect(() => {
    if (selectedSecret) {
      const updated = secrets.find(s => s.id === selectedSecret.id)
      if (updated && updated !== selectedSecret) {
        selectSecret(updated)
      }
    }
  }, [secrets, selectedSecret, selectSecret])

  if (!selectedSecret) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors">
        <div className="text-center">
          <Lock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">选择一个条目查看详情</p>
        </div>
      </div>
    )
  }

  const Icon = iconMap[selectedSecret.icon] || Key
  const gradientColor = iconColors[selectedSecret.icon] || 'from-yellow-400 to-amber-500'

  const toggleSensitive = (field: string) => {
    setShowSensitive((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const isFieldSensitive = (key: string) => {
    return SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))
  }

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const toggleFavorite = () => {
    updateSecret({
      id: selectedSecret.id,
      favorite: !selectedSecret.favorite,
    })
  }

  const handleDelete = () => {
    deleteSecret(selectedSecret.id)
    setShowDeleteConfirm(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 transition-colors">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                {selectedSecret.title}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {Object.keys(selectedSecret.fields).length} 个字段
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                selectedSecret.favorite
                  ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={selectedSecret.favorite ? '取消收藏' : '添加收藏'}
            >
              <Star className={`w-5 h-5 ${selectedSecret.favorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setEditingSecret(selectedSecret)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="编辑"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tags */}
        {selectedSecret.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedSecret.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4 mb-6">
          {Object.entries(selectedSecret.fields).map(([key, value]) => {
            const isSensitive = isFieldSensitive(key)
            const isVisible = showSensitive[key]

            return (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  {key}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <code className={`flex-1 text-sm font-mono break-all ${
                      isSensitive && !isVisible
                        ? 'text-slate-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {isSensitive && !isVisible ? '••••••••' : value}
                    </code>
                  </div>
                  {isSensitive && (
                    <button
                      onClick={() => toggleSensitive(key)}
                      className={`p-2 rounded-lg transition-colors ${
                        isVisible
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(value, key)}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedField === key
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    title="复制"
                  >
                    {copiedField === key ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>创建: {formatDate(selectedSecret.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>更新: {formatDate(selectedSecret.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                确认删除
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                确定要删除 "{selectedSecret.title}" 吗？此操作无法撤回。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
