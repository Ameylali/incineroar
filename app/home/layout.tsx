'use client';

import { StyleProvider } from '@ant-design/cssinjs';
import {
  DotChartOutlined,
  FileDoneOutlined,
  LogoutOutlined,
  ReconciliationOutlined,
} from '@ant-design/icons';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Breadcrumb,
  Col,
  ConfigProvider,
  Flex,
  Layout,
  Menu,
  MenuProps,
  Row,
  theme,
} from 'antd';
import { Content } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import Title from 'antd/es/typography/Title';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, ReactNode, useState } from 'react';

import foLabsLogo from '@/public/fo-labs.svg';
import pokeballIcon from '@/public/pokeball.svg';
import { queryClient } from '@/src/utils/query-clients';

const ContentLayout = ({ children }: PropsWithChildren) => {
  const breadcrumbs = useBreadcrumbs();

  return (
    <Flex vertical gap={30} className="h-full">
      {breadcrumbs.length > 1 && (
        <section>
          <Row>
            <Col>
              <Breadcrumb items={breadcrumbs} />
            </Col>
          </Row>
        </section>
      )}
      <section className="h-full overflow-y-auto">{children}</section>
    </Flex>
  );
};

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import useBreadcrumbs from '@/src/hooks/useBreadcrumbs';

import { signOut } from '../actions';

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
      onClick: () => router.push('/home/metagame'),
    },
    {
      label: 'Training',
      key: 'training',
      icon: <ReconciliationOutlined />,
      onClick: () => router.push('/home/training'),
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
          <Content className="h-full p-3">
            <ContentLayout>{children}</ContentLayout>
          </Content>
        </Layout>
      </Layout>
    </ProvidersWrapper>
  );
};

export default AppLayout;
