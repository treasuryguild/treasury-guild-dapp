// components/Navbar.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { FaDiscord, FaGithub, FaWallet, FaBars, FaTimes, FaChevronDown } from 'react-icons/fa';
import { useAuth } from '../contexts/auth-context';
import styles from '../styles/Navbar.module.css';
import LoginModal from '../components/LoginModal';
import { User, AuthContextType } from '../types/auth';

interface ConnectionStatusProps {
  user: User;
}

const ConnectionStatus = ({ user }: ConnectionStatusProps) => {
  return (
    <div className={styles.connectionStatus}>
      <FaDiscord 
        size={20} 
        className={user.discordId ? styles.iconConnected : styles.iconDisconnected} 
      />
      <FaGithub 
        size={20} 
        className={user.githubId ? styles.iconConnected : styles.iconDisconnected} 
      />
      <FaWallet 
        size={20} 
        className={user.wallets?.length > 0 ? styles.iconConnected : styles.iconDisconnected} 
      />
    </div>
  );
};

interface UserMenuProps {
  user: User;
}

const UserMenu = ({ user }: UserMenuProps) => {
  const { logout } = useAuth() as AuthContextType;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.dropdown}>
      <button 
        className={`${styles.button} ${styles.buttonGhost}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.discordUsername || user.wallets[0]?.address.slice(0, 8)}
        <FaChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className={styles.dropdownContent}>
          <Link href="/profile" className={styles.dropdownItem}>
            Profile
          </Link>
          <Link href="/organizations" className={styles.dropdownItem}>
            Organizations
          </Link>
          <button 
            onClick={logout} 
            className={`${styles.dropdownItem} ${styles.buttonGhost}`}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth() as AuthContextType;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          YourApp
        </Link>

        <div className={styles.desktopMenu}>
          {user && (
            <>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <ConnectionStatus user={user} />
            </>
          )}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <button 
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => setIsLoginModalOpen(true)}
            >
              Connect
            </button>
          )}
        </div>

        <button
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          {user ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <Link href="/profile" className={styles.navLink}>
                Profile
              </Link>
              <Link href="/organizations" className={styles.navLink}>
                Organizations
              </Link>
              <div className={styles.navLink}>
                <ConnectionStatus user={user} />
              </div>
              <button 
                onClick={logout}
                className={`${styles.button} ${styles.buttonGhost}`}
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => setIsLoginModalOpen(true)}
            >
              Connect
            </button>
          )}
        </div>
      )}

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </nav>
  );
};

export default Navbar;