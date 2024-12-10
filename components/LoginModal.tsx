import React, { useState, useEffect } from 'react';
import { FaDiscord, FaGithub, FaWallet, FaChevronDown } from 'react-icons/fa';
import { useAuth } from '../contexts/auth-context';
import { BrowserWallet } from '@meshsdk/core';
import styles from '../styles/Modal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  version: string;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { connectWallet, connectDiscord, connectGithub } = useAuth();
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const installedWallets = await BrowserWallet.getInstalledWallets();
        
        // Transform the wallets data to match our interface
        const walletList = installedWallets.map(wallet => ({
          id: wallet.id.toLowerCase(),
          name: wallet.name,
          icon: wallet.icon,
          version: wallet.version
        }));
        
        setAvailableWallets(walletList);
        // Set the first wallet as selected if we have any wallets
        if (walletList.length > 0 && !selectedWallet) {
          setSelectedWallet(walletList[0].id);
        }
      } catch (error) {
        console.error('Error fetching installed wallets:', error);
      } finally {
        setIsLoadingWallets(false);
      }
    };

    if (isOpen) {
      fetchWallets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectWallet = async () => {
    if (!selectedWallet) return;
    
    try {
      setIsConnecting(true);
      await connectWallet(selectedWallet);
      onClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const noWalletsInstalled = !isLoadingWallets && availableWallets.length === 0;

  return (
    <div className={styles.modal} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={e => e.stopPropagation()}
      >
        <h2 className={styles.modalTitle}>Connect Your Account</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className={styles.walletSelection}>
            <div className={styles.walletDropdown}>
              <button 
                className={`${styles.button} ${styles.buttonOutline} ${styles.dropdownButton}`}
                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                disabled={isConnecting || noWalletsInstalled}
              >
                {isLoadingWallets ? (
                  'Loading wallets...'
                ) : noWalletsInstalled ? (
                  'No wallets installed'
                ) : (
                  <>
                    {selectedWallet && (
                      <img 
                        src={availableWallets.find(w => w.id === selectedWallet)?.icon}
                        alt=""
                        className={styles.walletIcon}
                        width={20}
                        height={20}
                      />
                    )}
                    <span>{availableWallets.find(w => w.id === selectedWallet)?.name}</span>
                  </>
                )}
                <FaChevronDown size={16} />
              </button>
              
              {isWalletDropdownOpen && availableWallets.length > 0 && (
                <div className={styles.walletDropdownContent}>
                  {availableWallets.map(wallet => (
                    <button
                      key={wallet.id}
                      className={styles.walletOption}
                      onClick={() => {
                        setSelectedWallet(wallet.id);
                        setIsWalletDropdownOpen(false);
                      }}
                    >
                      <img 
                        src={wallet.icon} 
                        alt=""
                        className={styles.walletIcon}
                        width={20}
                        height={20}
                      />
                      <span>{wallet.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleConnectWallet}
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isConnecting || noWalletsInstalled || !selectedWallet}
            >
              <FaWallet size={20} />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
          
          <div className={styles.divider}>
            <span>Or connect with</span>
          </div>
          
          <button 
            onClick={connectDiscord}
            className={`${styles.button} ${styles.buttonOutline}`}
            disabled={isConnecting}
          >
            <FaDiscord size={20} />
            Connect Discord
          </button>
          
          <button 
            onClick={connectGithub}
            className={`${styles.button} ${styles.buttonOutline}`}
            disabled={isConnecting}
          >
            <FaGithub size={20} />
            Connect Github
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;