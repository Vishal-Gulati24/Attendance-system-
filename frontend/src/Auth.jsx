import { useState } from 'react'
import { api, setToken } from './api'
import './Auth.css'

export function Auth({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.login(username.trim(), password)
      setToken(data.token)
      onLogin()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const data = await api.auth.signup(username.trim(), password)
      setToken(data.token)
      onLogin()
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.auth.resetPassword(username.trim(), newPassword)
      setError('')
      setMode('login')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">Attendance</h1>
        <p className="auth__subtitle">
          {mode === 'login' && 'Sign in to your account'}
          {mode === 'signup' && 'Create your account'}
          {mode === 'forgot' && 'Reset your password'}
        </p>

        {error && <div className="auth__error">{error}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth__form">
            <div className="auth__field">
              <label className="auth__label">Username</label>
              <input
                type="text"
                className="auth__input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoComplete="username"
              />
            </div>
            <div className="auth__field">
              <label className="auth__label">Password</label>
              <input
                type="password"
                className="auth__input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="auth__btn auth__btn--primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              className="auth__link"
              onClick={() => { setMode('forgot'); setError(''); setPassword(''); }}
            >
              Forgot password?
            </button>
            <p className="auth__switch">
              Don't have an account?{' '}
              <button type="button" className="auth__link" onClick={() => { setMode('signup'); setError(''); setPassword(''); }}>
                Sign up
              </button>
            </p>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="auth__form">
            <div className="auth__field">
              <label className="auth__label">Username</label>
              <input
                type="text"
                className="auth__input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                autoComplete="username"
              />
            </div>
            <div className="auth__field">
              <label className="auth__label">Password</label>
              <input
                type="password"
                className="auth__input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="auth__btn auth__btn--primary" disabled={loading}>
              {loading ? 'Creating…' : 'Sign up'}
            </button>
            <p className="auth__switch">
              Already have an account?{' '}
              <button type="button" className="auth__link" onClick={() => { setMode('login'); setError(''); setPassword(''); }}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="auth__form">
            <div className="auth__field">
              <label className="auth__label">Username</label>
              <input
                type="text"
                className="auth__input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Your username"
                required
                autoComplete="username"
              />
            </div>
            <div className="auth__field">
              <label className="auth__label">New password</label>
              <input
                type="password"
                className="auth__input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="auth__field">
              <label className="auth__label">Confirm new password</label>
              <input
                type="password"
                className="auth__input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Same as above"
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="auth__btn auth__btn--primary" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <button
              type="button"
              className="auth__link"
              onClick={() => { setMode('login'); setError(''); setNewPassword(''); setConfirmPassword(''); }}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
