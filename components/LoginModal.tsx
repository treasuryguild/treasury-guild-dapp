// components/LoginModal.tsx
import React, { useState } from 'react';
import { FaDiscord, FaGithub, FaWallet, FaChevronDown } from 'react-icons/fa';
import { useAuth } from '../contexts/auth-context';
import styles from '../styles/Modal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define supported wallets
const SUPPORTED_WALLETS = [
  { id: 'nami', name: 'Nami' },
  { id: 'eternl', name: 'Eternl' },
  { id: 'flint', name: 'Flint' },
  { id: 'gero', name: 'GeroWallet' },
  // Add more wallets as needed
];

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { connectWallet, connectDiscord, connectGithub } = useAuth();
  const [selectedWallet, setSelectedWallet] = useState(SUPPORTED_WALLETS[0].id);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const handleConnectWallet = async () => {
    try {
      await connectWallet(selectedWallet);
      onClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

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
              >
                {SUPPORTED_WALLETS.find(w => w.id === selectedWallet)?.name}
                <FaChevronDown size={16} />
              </button>
              
              {isWalletDropdownOpen && (
                <div className={styles.walletDropdownContent}>
                  {SUPPORTED_WALLETS.map(wallet => (
                    <button
                      key={wallet.id}
                      className={styles.walletOption}
                      onClick={() => {
                        setSelectedWallet(wallet.id);
                        setIsWalletDropdownOpen(false);
                      }}
                    >
                      {wallet.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleConnectWallet}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              <FaWallet size={20} />
              Connect
            </button>
          </div>
          
          <div className={styles.divider}>
            <span>Or connect with</span>
          </div>
          
          <button 
            onClick={connectDiscord}
            className={`${styles.button} ${styles.buttonOutline}`}
          >
            <FaDiscord size={20} />
            Connect Discord
          </button>
          
          <button 
            onClick={connectGithub}
            className={`${styles.button} ${styles.buttonOutline}`}
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