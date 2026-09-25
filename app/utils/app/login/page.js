'use client'
import { useState } from 'react'
import { supabase } from '../utils/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage('Login ہو رہا ہے...')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Login کامیاب! ✅')
      window.location.href = '/'
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '400px', margin: '40px auto' }}>
      <h2 style={{ color: '#2563eb', textAlign: 'center', marginBottom: '20px' }}>Taleem Manager 📖</h2>
      <p style={{ textAlign: 'center', color: '#555', marginBottom: '20px' }}>اپنے اکاؤنٹ میں لاگ ان کریں</p>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
        />
        <button type="submit" style={{ padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}>
          Login
        </button>
      </form>
      
      {message && <p style={{ textAlign: 'center', marginTop: '20px', color: message.includes('Error') ? 'red' : 'green', fontWeight: 'bold' }}>{message}</p>}
    </div>
  )
      }
