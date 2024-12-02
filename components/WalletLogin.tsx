// components/WalletLogin.tsx
import { useWallet } from '@meshsdk/react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function WalletLogin() {
  const { wallet, connected } = useWallet()
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!connected) return
    setLoading(true)
    
    try {
      // Get wallet address
      const userAddress = (await wallet.getUsedAddresses())[0]
      
      // Get nonce
      const nonceRes = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: userAddress })
      })
      const { nonce } = await nonceRes.json()
      
      // Sign nonce
      const signature = await wallet.signData(nonce, userAddress)
      
      // Verify signature and get JWT
      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: userAddress,
          signature 
        })
      })
      
      const { success, token, user } = await verifyRes.json()
      if (success && token) {
        // Sign in to Supabase using the JWT
        const { data, error } = await supabase.auth.signInWithPassword({
          email: `${userAddress}@virtual.com`,
          password: token,
        })

        if (error) {
          // If user doesn't exist, sign up first
          if (error.status === 400) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: `${userAddress}@virtual.com`,
              password: token,
              options: {
                data: {
                  wallet_address: userAddress,
                  user_id: user.id
                }
              }
            })
            
            if (signUpError) throw signUpError
          } else {
            throw error
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading || !connected}
      className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
    >
      {loading ? 'Signing in...' : 'Sign in with Wallet'}
    </button>
  )
}