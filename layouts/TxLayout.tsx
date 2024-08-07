import React from 'react';
import RootLayout from './RootLayout';
import styles from '../styles/Layouts.module.css';

interface TxLayoutProps {
  children: React.ReactNode;
  blockchain?: string;
}

export default function TxLayout({ children, blockchain }: TxLayoutProps) {
  return (
    <RootLayout title="Transactions" description="View all transactions">
      <header className={styles.header}>
        <h1 className={styles.title}>
          Transactions{blockchain ? ` - ${blockchain}` : ''}
        </h1>
      </header>
      <main>{children}</main>
      <footer>
        Footer
      </footer>
    </RootLayout>
  );
}