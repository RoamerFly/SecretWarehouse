import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { Lock, Key, Eye, EyeOff, Check, AlertCircle, Download, RefreshCw, Copy, User, ShieldCheck, HelpCircle } from 'lucide-react'

interface MasterPasswordProps {
  onUnlock: (username: string) => void
}

type ViewMode = 'loading' | 'setup' | 'unlock' | 'showRecovery' | 'forgotPassword' | 'resetPassword' | 'changePassword' | 'securityQuestions'

const STORAGE_KEY_USERNAMES = 'secretwarehouse_usernames'
const STORAGE_KEY_LAST_USER = 'secretwarehouse_last_user'

export default function MasterPassword({ onUnlock }: MasterPasswordProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('loading')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [existingUsernames, setExistingUsernames] = useState<string[]>([])
  const [verificationMethod, setVerificationMethod] = useState<'password' | 'recovery'>('password')
  const [oldPassword, setOldPassword] = useState('')
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('')
  const [changePasswordNew, setChangePasswordNew] = useState('')
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('')
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)

  // Security questions state
  const [sqQuestions, setSQQuestions] = useState<string[]>([])
  const [sqAnswers, setSQAnswers] = useState<string[]>([])
  const [hasSQ, setHasSQ] = useState(false)

  useEffect(() => {
    initializeUsernames()
  }, [])

  const initializeUsernames = async () => {
    try {
      // 从后端获取已存在的用户名（后端是唯一可信来源）
      const backendUsernames = await invoke<string[]>('get_all_usernames')

      // 始终以后端数据为准，同步更新localStorage
      setExistingUsernames(backendUsernames)
      localStorage.setItem(STORAGE_KEY_USERNAMES, JSON.stringify(backendUsernames))

      // 获取上次登录的用户名
      const lastUser = localStorage.getItem(STORAGE_KEY_LAST_USER)

      // 验证lastUser是否在有效用户列表中
      if (lastUser && backendUsernames.includes(lastUser)) {
        setUsername(lastUser)
        // 检查该用户是否存在（已设置密码）
        const isSet = await invoke<boolean>('is_master_password_set', { username: lastUser })
        setViewMode(isSet ? 'unlock' : 'setup')
      } else if (backendUsernames.length > 0) {
        // 默认选择第一个用户
        setUsername(backendUsernames[0])
        const isSet = await invoke<boolean>('is_master_password_set', { username: backendUsernames[0] })
        setViewMode(isSet ? 'unlock' : 'setup')
      } else {
        // 后端无用户，清除lastUser缓存
        localStorage.removeItem(STORAGE_KEY_LAST_USER)
        setUsername('')
        setViewMode('setup')
      }
    } catch (err) {
      console.error('Failed to initialize usernames:', err)
      // 出错时也清除缓存，防止残留数据导致问题
      localStorage.removeItem(STORAGE_KEY_USERNAMES)
      localStorage.removeItem(STORAGE_KEY_LAST_USER)
      setExistingUsernames([])
      setViewMode('setup')
    }
  }

  const getStoredUsernames = (): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERNAMES)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const saveUsernameToList = (name: string) => {
    if (!name.trim()) return
    const stored = getStoredUsernames()
    if (!stored.includes(name)) {
      stored.push(name)
      localStorage.setItem(STORAGE_KEY_USERNAMES, JSON.stringify(stored))
      setExistingUsernames(stored)
    }
    // 保存为上次登录用户
    localStorage.setItem(STORAGE_KEY_LAST_USER, name)
  }

  const handleUsernameChange = async (newUsername: string) => {
    setUsername(newUsername)
    setError('')

    if (newUsername.trim()) {
      try {
        const isSet = await invoke<boolean>('is_master_password_set', { username: newUsername })
        setViewMode(isSet ? 'unlock' : 'setup')

        // Check if user has security questions
        const hasSecurityQ = await invoke<boolean>('has_security_questions', { username: newUsername })
        setHasSQ(hasSecurityQ)
      } catch (err) {
        console.error('Failed to check password status:', err)
      }
    }
  }

  const handleSetup = async () => {
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const code = await invoke<string>('set_master_password', { username, password })
      setRecoveryCode(code)
      saveUsernameToList(username)
      setViewMode('showRecovery')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setError('')
    setLoading(true)

    try {
      const success = await invoke<boolean>('verify_master_password', { username, password })
      if (success) {
        saveUsernameToList(username)
        onUnlock(username)
      } else {
        setError('密码错误')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRecoveryCode = async () => {
    try {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const defaultName = `SecretWarehouse_${username}_${recoveryCode.replace(/-/g, '')}_Recovery_Key_${dateStr}.txt`

      const filePath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Text', extensions: ['txt'] }]
      })

      if (filePath) {
        const content = `SecretWarehouse 恢复码
================================

用户名: ${username}
恢复码: ${recoveryCode}

请妥善保管此恢复码，忘记主密码时可用于恢复数据。

警告：
- 此恢复码仅显示一次，请立即保存
- 不要将此文件存储在云端或共享位置
- 建议打印并保存在安全的地方

生成时间: ${now.toLocaleString()}
`
        await writeTextFile(filePath, content)
      }
    } catch (err) {
      console.error('Failed to save recovery code:', err)
    }
  }

  const handleCopyRecoveryCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleContinueAfterRecovery = () => {
    onUnlock(username)
  }

  const handleForgotPassword = async () => {
    setError('')
    setLoading(true)

    try {
      const success = await invoke<boolean>('unlock_with_recovery_code', { username, recoveryCode: recoveryInput })
      if (success) {
        setViewMode('resetPassword')
      } else {
        setError('恢复码错误')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError('')

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await invoke('reset_password_with_recovery', {
        username,
        recoveryCode: recoveryInput,
        newPassword
      })
      onUnlock(username)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    if (changePasswordNew !== changePasswordConfirm) {
      setError('两次输入的密码不一致')
      return
    }

    if (verificationMethod === 'password' && !oldPassword) {
      setError('请输入当前密码')
      return
    }

    if (verificationMethod === 'recovery' && recoveryCodeInput.length < 14) {
      setError('请输入有效的恢复码')
      return
    }

    setLoading(true)
    try {
      await invoke('change_password', {
        username,
        verificationMethod,
        verificationCode: verificationMethod === 'password' ? oldPassword : recoveryCodeInput,
        newPassword: changePasswordNew
      })
      setChangePasswordSuccess(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setViewMode('unlock')
    setOldPassword('')
    setRecoveryCodeInput('')
    setChangePasswordNew('')
    setChangePasswordConfirm('')
    setChangePasswordSuccess(false)
    setVerificationMethod('password')
    setSQQuestions([])
    setSQAnswers([])
    setError('')
  }

  const handleGoToSecurityQuestions = async () => {
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    setError('')
    setLoading(true)

    try {
      const questions = await invoke<string[]>('get_security_questions', { username })
      setSQQuestions(questions)
      setSQAnswers(new Array(questions.length).fill(''))
      setViewMode('securityQuestions')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySecurityQuestions = async () => {
    setError('')

    // Check all answers are filled
    const validAnswers = sqAnswers.filter(a => a.trim())
    if (validAnswers.length !== sqQuestions.length) {
      setError('请回答所有密保问题')
      return
    }

    setLoading(true)
    try {
      await invoke('reset_password_with_security_questions', {
        username,
        answers: sqAnswers,
        newPassword
      })
      onUnlock(username)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const updateSQAnswer = (index: number, value: string) => {
    const newAnswers = [...sqAnswers]
    newAnswers[index] = value
    setSQAnswers(newAnswers)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  const renderContent = () => {
    switch (viewMode) {
      case 'loading':
        return (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )

      case 'showRecovery':
        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Key className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">保存恢复码</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                忘记密码时可用恢复码恢复数据
              </p>
            </div>

            {/* Recovery Code */}
            <div className="mb-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-2">您的恢复码</p>
                <div className="flex items-center justify-between">
                  <code className="text-2xl font-mono font-bold text-amber-800 dark:text-amber-300 tracking-wider">
                    {recoveryCode}
                  </code>
                  <button
                    onClick={handleCopyRecoveryCode}
                    className="p-2 text-amber-600 hover:text-amber-700 dark:text-amber-400"
                    title="复制"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400">
                  <strong>重要：</strong>此恢复码仅显示一次，请立即保存！忘记密码且丢失恢复码将无法恢复数据。
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSaveRecoveryCode}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>保存恢复码文件</span>
              </button>

              <button
                onClick={handleContinueAfterRecovery}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all"
              >
                我已保存，继续使用
              </button>
            </div>
          </>
        )

      case 'forgotPassword':
        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <RefreshCw className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">使用恢复码</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                输入您保存的恢复码
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  恢复码
                </label>
                <input
                  type="text"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => handleKeyDown(e, handleForgotPassword)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-lg tracking-wider text-center"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleForgotPassword}
                disabled={loading || recoveryInput.length < 14}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>验证恢复码</span>
                  </>
                )}
              </button>

              {hasSQ && (
                <button
                  onClick={handleGoToSecurityQuestions}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HelpCircle className="w-5 h-5" />
                      <span>使用密保问题</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setViewMode('unlock')}
                className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
              >
                返回登录
              </button>
            </div>
          </>
        )

      case 'changePassword':
        if (changePasswordSuccess) {
          return (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">修改成功</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  密码已成功修改，请使用新密码登录
                </p>
              </div>

              <button
                onClick={handleBackToLogin}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                <span>返回登录</span>
              </button>
            </>
          )
        }

        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">修改密码</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                通过原密码或恢复码验证身份
              </p>
            </div>

            {/* Two Column Layout */}
            <div className="flex gap-6">
              {/* Left Column: Verification */}
              <div className="flex-1 space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">身份验证</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    用户名
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      list="usernames-list"
                      placeholder="输入用户名"
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      autoFocus
                    />
                    <datalist id="usernames-list">
                      {existingUsernames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Verification Method Toggle */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    验证方式
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('password')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        verificationMethod === 'password'
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      原密码
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('recovery')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        verificationMethod === 'recovery'
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      恢复码
                    </button>
                  </div>
                </div>

                {/* Verification Input */}
                {verificationMethod === 'password' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      当前密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="输入当前密码"
                        className="w-full pl-11 pr-11 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      恢复码
                    </label>
                    <input
                      type="text"
                      value={recoveryCodeInput}
                      onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-lg tracking-wider text-center"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: New Password */}
              <div className="flex-1 space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">设置新密码</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={changePasswordNew}
                      onChange={(e) => setChangePasswordNew(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleChangePassword)}
                      placeholder="输入新密码"
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={changePasswordConfirm}
                      onChange={(e) => setChangePasswordConfirm(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleChangePassword)}
                      placeholder="再次输入新密码"
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Error message */}
                <div className="min-h-[48px]">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading || !username || !changePasswordNew || !changePasswordConfirm || (verificationMethod === 'password' && !oldPassword) || (verificationMethod === 'recovery' && recoveryCodeInput.length < 14)}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>修改密码</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={handleBackToLogin}
              className="w-full py-2 mt-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
            >
              返回登录
            </button>
          </>
        )

      case 'resetPassword':
        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">设置新密码</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                恢复码验证成功，请设置新密码
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
                    placeholder="输入新密码"
                    className="w-full pl-11 pr-11 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  确认新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
                    placeholder="再次输入新密码"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleResetPassword}
                disabled={loading || !newPassword || !confirmNewPassword}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>重置密码</span>
                  </>
                )}
              </button>
            </div>
          </>
        )

      case 'securityQuestions':
        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <HelpCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">密保问题验证</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                回答以下密保问题以重置密码
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* Security Questions */}
              {sqQuestions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {question}
                  </label>
                  <input
                    type="text"
                    value={sqAnswers[index] || ''}
                    onChange={(e) => updateSQAnswer(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleVerifySecurityQuestions)}
                    placeholder="输入答案"
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus={index === 0}
                  />
                </div>
              ))}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleVerifySecurityQuestions)}
                    placeholder="输入新密码"
                    className="w-full pl-11 pr-11 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  确认新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleVerifySecurityQuestions)}
                    placeholder="再次输入新密码"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerifySecurityQuestions}
                disabled={loading || !newPassword || !confirmNewPassword || sqAnswers.some(a => !a.trim())}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>验证并重置密码</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBackToLogin}
                className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
              >
                返回登录
              </button>
            </div>
          </>
        )

      case 'setup':
        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Key className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SecretWarehouse</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                设置主密码以保护您的数据
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    list="usernames-list"
                    placeholder="输入用户名"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                  <datalist id="usernames-list">
                    {existingUsernames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  设置主密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSetup)}
                    placeholder="输入密码"
                    className="w-full pl-11 pr-11 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSetup)}
                    placeholder="再次输入密码"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSetup}
                disabled={loading || !username || !password || !confirmPassword}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>创建账户</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                主密码用于加密您的所有数据。请牢记此密码，忘记后将无法恢复数据（除非您保存了恢复码）。
              </p>
            </div>
          </>
        )

      case 'unlock':
      default:
        return (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Key className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SecretWarehouse</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                输入主密码解锁
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    list="usernames-list"
                    placeholder="输入用户名"
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <datalist id="usernames-list">
                    {existingUsernames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  主密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleUnlock)}
                    placeholder="输入主密码"
                    className="w-full pl-11 pr-11 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleUnlock}
                disabled={loading || !username || !password}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>解锁</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setViewMode('forgotPassword')}
                className="w-full py-2 text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 text-sm"
              >
                忘记密码？使用恢复码
              </button>

              <button
                onClick={() => setViewMode('changePassword')}
                className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
              >
                修改密码
              </button>
            </div>
          </>
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
