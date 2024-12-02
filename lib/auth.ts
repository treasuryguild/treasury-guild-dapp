// lib/auth.ts
import { supabase } from './supabase'
import { generateNonce, checkSignature } from '@meshsdk/core'

export async function handleWalletLogin(walletAddress: string) {
  // Check if wallet exists
  const { data: wallet } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  // Generate new nonce
  const nonce = generateNonce('Sign to login: ')
  
  if (!wallet) {
    // If wallet doesn't exist, create temporary entry
    const { data: newWallet } = await supabase
      .from('user_wallets')
      .insert({
        wallet_address: walletAddress,
        nonce: nonce
      })
      .single()
    
    return { nonce, isNew: true }
  }

  // Update existing wallet nonce
  await supabase
    .from('user_wallets')
    .update({ nonce })
    .eq('wallet_address', walletAddress)

  return { nonce, isNew: false, userId: wallet.user_id }
}

export async function verifyWalletSignature(walletAddress: string, signature: any) {
  // Get wallet and nonce
  const { data: wallet } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (!wallet) return { success: false }

  // Verify signature
  const isValid = checkSignature(wallet.nonce, signature, walletAddress)
  if (!isValid) return { success: false }

  // If new wallet, create user profile
  if (!wallet.user_id) {
    const { data: profile }: { data: { id: string } | null } = await supabase
      .from('user_profiles')
      .insert({
        username: `wallet_${walletAddress.slice(0, 8)}`,
        primary_wallet: walletAddress
      })
      .single()

    // Link wallet to user
    if (profile) {
      await supabase
        .from('user_wallets')
        .update({ user_id: profile.id })
        .eq('wallet_address', walletAddress)
    } else {
      return { success: false }
    }

    return { success: true, userId: profile.id }
  }

  return { success: true, userId: wallet.user_id }
}
