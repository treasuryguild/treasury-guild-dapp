// types/auth.ts
export interface WalletInfo {
  address: string;
  isPrimary: boolean;
  provider: string;
}

export interface User {
  id: string;
  discord_id?: string;
  discord_username?: string;
  github_id?: string;
  github_username?: string;
  wallets: WalletInfo[];
  organizations?: string[];
  discord_roles?: string[];
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