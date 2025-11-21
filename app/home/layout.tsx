'use client';

import { StyleProvider } from '@ant-design/cssinjs';
import {
  DotChartOutlined,
  FileDoneOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Flex, Layout, Menu, MenuProps, theme } from 'antd';
import { Content } from 'antd/lib/layout/layout';
import Sider from 'antd/lib/layout/Sider';
import Title from 'antd/lib/typography/Title';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

import foLabsLogo from '@/public/fo-labs.svg';
import pokeballIcon from '@/public/pokeball.svg';

import { signOut } from '../actions';

const client = new QueryClient();

const ProvidersWrapper = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <QueryClientProvider client={client}>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <StyleProvider layer>{children}</StyleProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

const AppLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const UpperMenuItems: MenuProps['items'] = [
    {
      label: 'Teams',
      key: 'teams',
      icon: <Image src={pokeballIcon as string} alt="pokeball" width={14} />,
      onClick: () => router.push('/home/teams'),
    },
    {
      label: 'Metagame',
      key: 'metagame',
      icon: <DotChartOutlined />,
    },
    {
      label: 'Team judge',
      key: 'team-judge',
      icon: <FileDoneOutlined />,
    },
  ];

  const LowerMenuItems: MenuProps['items'] = [
    {
      label: 'Sign out',
      key: 'signout',
      icon: <LogoutOutlined />,
      onClick: () => void signOut(),
    },
  ];

  return (
    <ProvidersWrapper>
      <Layout className="flex h-dvh flex-row">
        <Sider
          width={180}
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <Flex vertical justify="space-between" className="h-full">
            <Flex vertical className="pt-2">
              {collapsed ? (
                <Image
                  className="self-center"
                  src={foLabsLogo as string}
                  alt="fakeout labs"
                  width={30}
                />
              ) : (
                <Title className="ml-3 text-white">FakeOut Labs</Title>
              )}
              <Menu theme="dark" mode="inline" items={UpperMenuItems} />
            </Flex>
            <Flex vertical>
              <Menu theme="dark" mode="inline" items={LowerMenuItems} />
            </Flex>
          </Flex>
        </Sider>
        <Layout>
          <Content className="p-3">{children}</Content>
        </Layout>
      </Layout>
    </ProvidersWrapper>
  );
};

export default AppLayout;
