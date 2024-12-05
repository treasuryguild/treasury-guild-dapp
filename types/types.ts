// types.ts
type WalletInfo = {
  address: string;
  isPrimary: boolean;
}

type UserProfile = {
  id: string;
  email?: string;
  discordId?: string;
  discordUsername?: string;
  githubId?: string;
  githubUsername?: string;
  wallets: WalletInfo[];
  organizations: string[]; // IDs of organizations user belongs to
  discordRoles?: string[];
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

