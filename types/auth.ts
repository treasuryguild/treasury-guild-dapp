// types/auth.ts
export interface WalletInfo {
  address: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  discordId?: string;
  discordUsername?: string;
  githubId?: string;
  githubUsername?: string;
  wallets: WalletInfo[];
  organizations?: string[];
  discordRoles?: string[];
}

export interface AuthContextType {
  user: User | null;
  connectWallet: (provider: string) => Promise<void>;  
  connectDiscord: () => Promise<void>;
  connectGithub: () => Promise<void>;
  setPrimaryWallet: (address: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}