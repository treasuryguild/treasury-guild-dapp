// Assuming this file is saved as layouts/ExamplePageLayout.js
import RootLayout from './RootLayout';
import styles from '../styles/Layouts.module.css';

export default function TxLayout({ children, blockchain }: Readonly<{children: React.ReactNode; blockchain: string;}>) {
  return (
    <RootLayout title="Transactions" description="View all transactions">
      <header className={styles.header}>
        <h1 className={styles.title}>Transactions - {blockchain}</h1>
      </header>
      <main>{children}</main>
      <footer>
        Footer
      </footer>
    </RootLayout>
  );
}