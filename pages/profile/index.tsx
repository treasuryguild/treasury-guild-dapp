// pages/profile/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { FaDiscord, FaGithub, FaWallet, FaCheck } from 'react-icons/fa';
import { useAuth } from '../../contexts/auth-context';
import { BrowserWallet } from '@meshsdk/core';
import type { NextPage } from "next";
import ProtectedRoute from '../../components/ProtectedRoute';
import styles from '../../styles/Profile.module.css';

interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  version: string;
}

const ProfileContent = () => {
  const { user, connectWallet, connectDiscord, connectGithub, setPrimaryWallet } = useAuth();
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkWallet() {
    if (!user?.wallets?.length) return;
    
    const primaryWallet = user.wallets.find(w => w.isPrimary);
    if (!primaryWallet) return;
  
    try {
      const wallet = await BrowserWallet.enable(primaryWallet.provider);
      const address = await wallet.getChangeAddress();
      console.log('Wallet address:', address);
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  }

  useEffect(() => {
    fetchWallets();
  }, []);
  
  useEffect(() => {
    console.log('Current user:', user);
    if (user) {
      checkWallet()
    }
  }, [user]);

  const fetchWallets = async () => {
    try {
      const installedWallets = await BrowserWallet.getInstalledWallets();
      const walletList = installedWallets.map(wallet => ({
        id: wallet.id.toLowerCase(),
        name: wallet.name,
        icon: wallet.icon,
        version: wallet.version
      }));
      setAvailableWallets(walletList);
      setError(null);
    } catch (error) {
      setError('Failed to load wallets');
      console.error('Error fetching wallets:', error);
    } finally {
      setIsLoadingWallets(false);
    }
  };

  const handleConnectWallet = async (walletId: string) => {
    setError(null);
    try {
      setIsConnecting(true);
      await connectWallet(walletId);
    } catch (error) {
      setError('Failed to connect wallet');
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSetPrimaryWallet = async (address: string) => {
    setError(null);
    try {
      await setPrimaryWallet(address);
    } catch (error) {
      setError('Failed to set primary wallet');
      console.error('Failed to set primary wallet:', error);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profile</h1>

      {/* Connection Status Summary */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Connected Accounts</h2>
        <div className={styles.accountsGrid}>
        <div className={styles.accountItem}>
            <FaDiscord 
              size={24} 
              className={user.discord_id ? styles.connected : styles.disconnected} 
            />
            <span>{user.discord_username || "Discord not connected"}</span>
            {!user.discord_id && (
              <button
                onClick={connectDiscord}
                className={`${styles.connectButton} ${styles.connectButtonDiscord}`}
                disabled={isConnecting}
              >
                Connect
              </button>
            )}
          </div>
          <div className={styles.accountItem}>
            <FaGithub 
              size={24} 
              className={user.github_id ? styles.connected : styles.disconnected} 
            />
            <span>{user.github_username || "GitHub not connected"}</span>
            {!user.github_id && (
              <button
                onClick={connectGithub}
                className={`${styles.connectButton} ${styles.connectButtonGithub}`}
                disabled={isConnecting}
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wallets Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Connected Wallets</h2>
        
        {error && <p className={styles.errorText}>{error}</p>}
        
        {/* Current Wallets */}
        {user.wallets.length > 0 && (
          <div>
            <h3 className={styles.subsectionTitle}>Your Wallets</h3>
            <div className={styles.walletsList}>
              {user.wallets.map((wallet) => (
                <div 
                  key={wallet.address}
                  className={styles.walletItem}
                >
                  <div className={styles.walletInfo}>
                    <FaWallet size={20} />
                    <span className={styles.walletAddress}>
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    </span>
                    {wallet.isPrimary && (
                      <span className={styles.primaryBadge}>
                        Primary
                      </span>
                    )}
                  </div>
                  {!wallet.isPrimary && (
                    <button
                      onClick={() => handleSetPrimaryWallet(wallet.address)}
                      className={styles.setPrimaryButton}
                      disabled={isConnecting}
                    >
                      Set as Primary
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Wallets */}
        <div>
          <h3 className={styles.subsectionTitle}>Add Wallet</h3>
          {isLoadingWallets ? (
            <p className={styles.loadingText}>Loading available wallets...</p>
          ) : (
            <div className={styles.availableWalletsGrid}>
              {availableWallets.map((wallet) => {
                const isConnected = user.wallets.some(w => 
                  w.address.toLowerCase() === wallet.id.toLowerCase()
                );

                return (
                  <button
                    key={wallet.id}
                    onClick={() => !isConnected && handleConnectWallet(wallet.id)}
                    disabled={isConnected || isConnecting}
                    className={`${styles.walletButton} ${
                      isConnected ? styles.walletButtonDisabled : styles.walletButtonEnabled
                    }`}
                  >
                    <div className={styles.walletInfo}>
                      <img 
                        src={wallet.icon} 
                        alt="" 
                        className={styles.walletIcon}
                      />
                      <span>{wallet.name}</span>
                    </div>
                    {isConnected ? (
                      <FaCheck className={styles.connected} />
                    ) : (
                      <span>Connect</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Profile: NextPage = () => {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
};

export default Profile;