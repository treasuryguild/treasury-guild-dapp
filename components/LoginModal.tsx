// components/LoginModal.tsx
import React from 'react';
import { FaDiscord, FaGithub, FaWallet } from 'react-icons/fa';
import { useAuth } from '../contexts/auth-context';
import styles from '../styles/Navbar.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { connectWallet, connectDiscord, connectGithub } = useAuth();

  if (!isOpen) return null;

  return (
    <div className={styles.modal} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={e => e.stopPropagation()}
      >
        <h2 className={styles.modalTitle}>Connect Your Account</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={connectWallet}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <FaWallet size={20} />
            Connect Cardano Wallet
          </button>
          
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