// types.ts
type WalletInfo = {
  address: string;
  isPrimary: boolean;
  provider: string;
}

type UserProfile = {
  id: string;
  email?: string;
  discord_id?: string;
  discord_username?: string;
  github_id?: string;
  github_username?: string;
  wallets: WalletInfo[];
  organizations: string[]; 
  discord_roles?: string[];
}

type Organization = {
  id: string;
  name: string;
  walletAddress: string;
  members: {
    userId: string;
    role: 'admin' | 'member';
  }[];
}

