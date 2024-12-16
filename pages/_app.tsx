// _app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { MeshProvider } from "@meshsdk/react";
import { AuthProvider } from '../shared/contexts/auth-context';
import Navbar from "../components/Navbar";
import Head from 'next/head';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <AuthProvider>
        <MeshProvider>
          <Navbar />
          <Component {...pageProps} />
        </MeshProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp;