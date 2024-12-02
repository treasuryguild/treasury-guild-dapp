// types.ts
type UserWallet = {
  id: string
  user_id: string
  wallet_address: string
  nonce: string
  created_at: string
}

type UserProfile = {
  id: string
  discord_id?: string
  primary_wallet?: string
  email?: string
  username: string
  created_at: string
}