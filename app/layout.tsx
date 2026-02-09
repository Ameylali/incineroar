'use client';

import './globals.css';
import '@ant-design/v5-patch-for-react-19';

import { StyleProvider } from '@ant-design/cssinjs';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ConfigProvider from 'antd/es/config-provider';
import { ReactNode } from 'react';

import useTitle from '@/src/hooks/useTitle';
import { queryClient } from '@/src/utils/query-clients';
import { theme } from '@/src/utils/theme';

const ProvidersWrapper = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
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
  useTitle();

  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ProvidersWrapper>{children}</ProvidersWrapper>
        </AntdRegistry>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
};

export default RootLayout;
