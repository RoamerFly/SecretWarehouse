import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { X, Plus, Trash2 } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {editingSecret ? '编辑条目' : '新建条目'}
          </h2>
          <button
            onClick={() => setShowForm(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              图标
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name)}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    icon === opt.name
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                字段
              </label>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
              >
                <Plus className="w-3.5 h-3.5" />
                添加
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateField(index, e.target.value, field.value)}
                    placeholder="字段名"
                    className="w-24 px-2.5 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type={isFieldSensitive(field.key) ? 'password' : 'text'}
                    value={field.value}
                    onChange={(e) => updateField(index, field.key, e.target.value)}
                    placeholder="值..."
                    className="flex-1 px-2.5 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
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
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              标签 <span className="text-slate-400">(逗号分隔)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="工作, 个人..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? '保存中...' : (editingSecret ? '保存' : '创建')}
          </button>
        </div>
      </div>
    </div>
  )
}
