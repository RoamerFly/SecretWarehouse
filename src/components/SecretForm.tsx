import { useState, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { X, Plus, Trash2, Lock, Unlock, FileText, Save, Tag, GripVertical } from 'lucide-react'
import { ICON_OPTIONS, Template } from '../types'
import { iconMap, iconColors } from '../constants/icons'

// 生成唯一ID
let fieldIdCounter = 0
const generateFieldId = () => `field_${++fieldIdCounter}_${Date.now()}`

interface FieldItem {
  id: string
  key: string
  value: string
  sensitive: boolean
}

export default function SecretForm() {
  const { editingSecret, setEditingSecret, setShowForm, createSecret, updateSecret, allTags, setShowTemplates, createTemplate } = useStore()

  // Check for selected template
  const selectedTemplate = (window as any).__selectedTemplate as Template | undefined

  const [title, setTitle] = useState(editingSecret?.title || '')
  const [description, setDescription] = useState(
    editingSecret?.description || selectedTemplate?.description || ''
  )
  const [fields, setFields] = useState<Array<FieldItem>>(
    editingSecret
      ? Object.entries(editingSecret.fields).map(([key, value]) => ({
          id: generateFieldId(),
          key,
          value,
          sensitive: editingSecret.sensitiveFields?.includes(key) || false
        }))
      : selectedTemplate?.fields.map(key => ({ id: generateFieldId(), key, value: '', sensitive: false })) || [{ id: generateFieldId(), key: '', value: '', sensitive: false }]
  )
  const [tags, setTags] = useState<string[]>(
    editingSecret?.tags || selectedTemplate?.tags || []
  )
  const [tagInput, setTagInput] = useState('')
  const [icon, setIcon] = useState(editingSecret?.icon || selectedTemplate?.icon || 'key')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // Clean up template on unmount
  useEffect(() => {
    return () => {
      delete (window as any).__selectedTemplate
    }
  }, [])

  // 全局鼠标释放监听
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDraggedIndex(null)
      setHoveredIndex(null)
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const fieldsObj: Record<string, string> = {}
      const sensitiveFields: string[] = []
      fields.forEach(f => {
        if (f.key.trim()) {
          fieldsObj[f.key.trim()] = f.value
          if (f.sensitive) {
            sensitiveFields.push(f.key.trim())
          }
        }
      })

      if (editingSecret) {
        await updateSecret({ id: editingSecret.id, title, description, fields: fieldsObj, tags, icon, sensitiveFields })
      } else {
        await createSecret({ title, description, fields: fieldsObj, tags, icon, sensitiveFields })
      }
      setEditingSecret(null)
      setShowForm(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const addField = () => {
    setFields([...fields, { id: generateFieldId(), key: '', value: '', sensitive: false }])
  }

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index))
    }
  }

  const updateField = (index: number, key: string, value: string) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], key, value }
    setFields(newFields)
  }

  const toggleFieldSensitive = (index: number) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], sensitive: !newFields[index].sensitive }
    setFields(newFields)
  }

  // Drag and drop handlers - 使用鼠标事件实现更可靠的拖拽
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.MouseEvent, index: number) => {
    // 只响应左键
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setDraggedIndex(index)
  }

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index)
    // 如果正在拖拽且悬停到不同字段，直接交换
    if (draggedIndex !== null && draggedIndex !== index) {
      const newFields = [...fields]
      const temp = newFields[draggedIndex]
      newFields[draggedIndex] = newFields[index]
      newFields[index] = temp
      setFields(newFields)
      setDraggedIndex(index)
    }
  }

  const handleMouseUp = () => {
    setDraggedIndex(null)
    setHoveredIndex(null)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return

    const fieldsArray = fields.filter(f => f.key.trim()).map(f => f.key.trim())

    await createTemplate({
      name: templateName,
      description,
      fields: fieldsArray,
      tags,
      icon
    })
    setShowSaveAsTemplate(false)
    setTemplateName('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700/60 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/40">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingSecret ? '编辑条目' : '新建条目'}
          </h2>
          <div className="flex items-center gap-2">
            {!editingSecret && (
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                从模板
              </button>
            )}
            <button
              onClick={() => setShowForm(false)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题..."
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述信息..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">图标</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(opt => {
                const IconComponent = iconMap[opt.name]
                const gradientColor = iconColors[opt.name] || 'from-yellow-400 to-amber-500'
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIcon(opt.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      icon === opt.name
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25 scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
                      {IconComponent && <IconComponent className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">字段</label>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-all hover:scale-105"
              >
                <Plus className="w-3 h-3" />
                添加字段
              </button>
            </div>
            <div className="space-y-2" onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  onMouseEnter={() => handleMouseEnter(index)}
                  className={`flex gap-2 animate-in slide-in-from-left-2 duration-200 select-none ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${hoveredIndex === index && draggedIndex !== null && draggedIndex !== index ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}
                >
                  {/* Drag handle */}
                  <div
                    onMouseDown={(e) => handleDragStart(e, index)}
                    className={`flex items-center cursor-grab active:cursor-grabbing px-1 transition-colors ${
                      draggedIndex === index ? 'text-violet-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateField(index, e.target.value, field.value)}
                    placeholder="字段名"
                    className="w-28 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <div className="relative flex-1">
                    <input
                      type={field.sensitive ? 'password' : 'text'}
                      value={field.value}
                      onChange={(e) => updateField(index, field.key, e.target.value)}
                      placeholder="值..."
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                    {field.sensitive && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-in zoom-in duration-200" />
                    )}
                  </div>
                  {/* Sensitive toggle */}
                  <button
                    type="button"
                    onClick={() => toggleFieldSensitive(index)}
                    className={`p-2.5 rounded-xl transition-all hover:scale-110 ${
                      field.sensitive
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}
                    title={field.sensitive ? '取消遮蔽' : '遮蔽字段'}
                  >
                    {field.sensitive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-2.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20"
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
              标签 <span className="font-normal text-slate-500">(回车添加)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签后按回车添加..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            {/* Added tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-sm font-medium animate-in zoom-in duration-200"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Quick tag selection */}
            {allTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">已有标签：</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.filter(t => !tags.includes(t)).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/40 flex gap-3">
          {!editingSecret && (
            <button
              type="button"
              onClick={() => setShowSaveAsTemplate(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              存为模板
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="flex-1 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-lg shadow-violet-500/25 disabled:shadow-none"
          >
            {isSubmitting ? '保存中...' : (editingSecret ? '保存修改' : '创建条目')}
          </button>
        </div>
      </div>

      {/* Save as template modal */}
      {showSaveAsTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">保存为模板</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              将当前配置保存为模板，方便以后快速创建类似条目。
            </p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="输入模板名称..."
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveAsTemplate(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim()}
                className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-medium transition-colors hover:bg-violet-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
