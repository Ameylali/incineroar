'use client';

import './globals.css';
import '@ant-design/v5-patch-for-react-19';

import { StyleProvider } from '@ant-design/cssinjs';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { theme } from 'antd';
import ConfigProvider from 'antd/es/config-provider';
import { Geist, Geist_Mono } from 'next/font/google';
import { ReactNode } from 'react';

import { queryClient } from '@/src/utils/query-clients';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const ProvidersWrapper = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <StyleProvider layer>{children}</StyleProvider>
      </ConfigProvider>
      {process.env.NEXT_PUBLIC_ENVIRONMENT === 'dev' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <ProvidersWrapper>{children}</ProvidersWrapper>
        </AntdRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
