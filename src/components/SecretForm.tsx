import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { X, Plus, Trash2, Lock, Sparkles } from 'lucide-react'
import { ICON_OPTIONS } from '../types'

const SENSITIVE_KEYWORDS = ['password', '密码', 'secret', '密钥', 'key', 'token', 'cvv', 'pin']

export default function SecretForm() {
  const { editingSecret, setEditingSecret, setShowForm, createSecret, updateSecret } = useStore()

  const [title, setTitle] = useState(editingSecret?.title || '')
  const [fields, setFields] = useState<Array<{ key: string; value: string }>>(
    editingSecret
      ? Object.entries(editingSecret.fields).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }]
  )
  const [tags, setTags] = useState(editingSecret?.tags.join(', ') || '')
  const [icon, setIcon] = useState(editingSecret?.icon || 'key')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const fieldsObj: Record<string, string> = {}
      fields.forEach(f => {
        if (f.key.trim()) {
          fieldsObj[f.key.trim()] = f.value
        }
      })

      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean)

      if (editingSecret) {
        await updateSecret({ id: editingSecret.id, title, fields: fieldsObj, tags: tagsArray, icon })
      } else {
        await createSecret({ title, fields: fieldsObj, tags: tagsArray, icon })
      }
      // 保存成功后关闭表单
      setEditingSecret(null)
      setShowForm(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const addField = () => {
    setFields([...fields, { key: '', value: '' }])
  }

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index))
    }
  }

  const updateField = (index: number, key: string, value: string) => {
    const newFields = [...fields]
    newFields[index] = { key, value }
    setFields(newFields)
  }

  const isFieldSensitive = (key: string) => {
    return SENSITIVE_KEYWORDS.some(kw => key.toLowerCase().includes(kw))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-slate-200/60 dark:border-slate-700/60">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              {editingSecret ? <Sparkles className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {editingSecret ? '编辑条目' : '新建条目'}
            </h2>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4" />
              </div>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200/60 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              图标
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    icon === opt.name
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25 scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                字段
              </label>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加字段
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={index} className="flex gap-2 group">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateField(index, e.target.value, field.value)}
                    placeholder="字段名"
                    className="w-28 px-3 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-all"
                  />
                  <div className="relative flex-1">
                    <input
                      type={isFieldSensitive(field.key) ? 'password' : 'text'}
                      value={field.value}
                      onChange={(e) => updateField(index, field.key, e.target.value)}
                      placeholder="值..."
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-all"
                    />
                    {isFieldSensitive(field.key) && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              标签 <span className="font-normal text-slate-400">(逗号分隔)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="工作, 个人..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200/60 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 border-t border-slate-200/60 dark:border-slate-700/40 flex gap-3">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-semibold transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 disabled:shadow-none transition-all disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </span>
            ) : (editingSecret ? '保存修改' : '创建条目')}
          </button>
        </div>
      </div>
    </div>
  )
}
