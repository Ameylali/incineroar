'use client';

import {
  DotChartOutlined,
  FileDoneOutlined,
  LogoutOutlined,
  ReconciliationOutlined,
} from '@ant-design/icons';
import {
  Breadcrumb,
  Col,
  Flex,
  Layout,
  Menu,
  MenuProps,
  Row,
  Skeleton,
} from 'antd';
import { Content } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import Title from 'antd/es/typography/Title';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, ReactNode, useState } from 'react';

import foLabsLogo from '@/public/fo-labs.svg';
import pokeballIcon from '@/public/pokeball.svg';
import useBreadcrumbs from '@/src/hooks/useBreadcrumbs';
import { useClientUserQuery } from '@/src/hooks/useUserQuery';
import { queryClient } from '@/src/utils/query-clients';

import { signOut } from '../actions';

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

const AppLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { data: user, isLoading, isError } = useClientUserQuery();

  // Handle loading and error states
  if (isLoading) {
    return <Skeleton active />;
  }

  if (isError || !user) {
    // Redirect to auth if user query fails
    router.push('/auth');
    return <div>Redirecting...</div>;
  }

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
    user.role === 'admin'
      ? {
          label: 'Admin',
          key: 'team-judge',
          icon: <FileDoneOutlined />,
          children: [
            {
              label: 'Metagame',
              key: 'admin-metagame',
              onClick: () => router.push('/home/metagame/admin'),
            },
          ],
        }
      : null,
  ];

  const LowerMenuItems: MenuProps['items'] = [
    {
      label: 'Sign out',
      key: 'signout',
      icon: <LogoutOutlined />,
      onClick: () => {
        queryClient.clear();
        void signOut();
      },
    },
  ];

  return (
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
            <Menu theme="light" mode="inline" items={UpperMenuItems} />
          </Flex>
          <Flex vertical>
            <Menu theme="light" mode="inline" items={LowerMenuItems} />
          </Flex>
        </Flex>
      </Sider>
      <Layout>
        <Content className="h-full p-3">
          <ContentLayout>{children}</ContentLayout>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
