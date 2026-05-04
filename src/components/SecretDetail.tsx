import { useState } from 'react'
import { useStore } from '../stores/useStore'
import {
  Key, Lock, Star, Eye, EyeOff, Copy, Edit,
  Trash2, Clock, CheckCircle2, Shield, Sparkles,
} from 'lucide-react'
import { iconMap, iconColors } from '../constants/icons'

const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

export default function SecretDetail() {
  const { selectedSecret, secrets, updateSecret, deleteSecret, setEditingSecret } = useStore()
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 从 secrets 数组中获取最新的数据（如果有的话）
  const currentSecret = selectedSecret
    ? secrets.find(s => s.id === selectedSecret.id) || selectedSecret
    : null

  if (!currentSecret) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400 mb-2">选择一个条目查看详情</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">从左侧列表中选择或创建新条目</p>
        </div>
      </div>
    )
  }

  const Icon = iconMap[currentSecret.icon] || Key
  const gradientColor = iconColors[currentSecret.icon] || 'from-yellow-400 to-amber-500'

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
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const toggleFavorite = () => {
    updateSecret({
      id: currentSecret.id,
      favorite: !currentSecret.favorite,
    })
  }

  const handleDelete = () => {
    deleteSecret(currentSecret.id)
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-xl`}>
              <Icon className="w-7 h-7 text-white" />
              {currentSecret.favorite && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                  <Star className="w-3.5 h-3.5 text-white fill-current" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentSecret.title}
              </h1>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {Object.keys(currentSecret.fields).length} 个字段
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleFavorite}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                currentSecret.favorite
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
              title={currentSecret.favorite ? '取消收藏' : '添加收藏'}
            >
              <Star className={`w-5 h-5 ${currentSecret.favorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setEditingSecret(currentSecret)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200"
              title="编辑"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tags */}
        {currentSecret.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {currentSecret.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200/60 dark:border-slate-700/60"
              >
                <span className="text-slate-400">#</span>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-5 mb-8">
          {Object.entries(currentSecret.fields).map(([key, value]) => {
            const isSensitive = isFieldSensitive(key)
            const isVisible = showSensitive[key]

            return (
              <div key={key} className="group">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                  {key}
                </label>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 ${
                    isSensitive
                      ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/40'
                  } group-hover:border-slate-300 dark:group-hover:border-slate-600`}>
                    {isSensitive && (
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                    )}
                    <code className={`flex-1 text-sm font-mono break-all ${
                      isSensitive && !isVisible
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {isSensitive && !isVisible ? '••••••••••••••••' : value}
                    </code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSensitive && (
                      <button
                        onClick={() => toggleSensitive(key)}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          isVisible
                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                            : 'text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                        }`}
                      >
                        {isVisible ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className={`p-2.5 rounded-xl transition-all duration-200 ${
                        copiedField === key
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                      title="复制"
                    >
                      {copiedField === key ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <Copy className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Metadata */}
        <div className="pt-6 border-t border-slate-200/60 dark:border-slate-700/40">
          <div className="flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>创建: {formatDate(currentSecret.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>更新: {formatDate(currentSecret.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center mb-5 shadow-lg">
                <Trash2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                确认删除
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                确定要删除 "<span className="font-semibold text-slate-700 dark:text-slate-300">{currentSecret.title}</span>" 吗？此操作无法撤回。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25 transition-all"
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
