'use client';

import { StyleProvider } from '@ant-design/cssinjs';
import {
  DotChartOutlined,
  FileDoneOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Flex, Layout, Menu, MenuProps } from 'antd';
import { Content } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import Title from 'antd/es/typography/Title';
import Image from 'next/image';
import { ReactNode, useState } from 'react';

import foLabsLogo from '@/public/fo-labs.svg';
import pokeballIcon from '@/public/pokeball.svg';

import { signOut } from '../actions';

const UpperMenuItems: MenuProps['items'] = [
  {
    label: 'Teams',
    key: 'teams',
    icon: <Image src={pokeballIcon as string} alt="pokeball" width={14} />,
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

const AppLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <StyleProvider layer>
      <Layout style={{ minHeight: '100vh' }}>
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
                <Title className="text-center text-white">FakeOut Labs</Title>
              )}
              <Menu theme="dark" mode="inline" items={UpperMenuItems} />
            </Flex>
            <Flex vertical>
              <Menu theme="dark" mode="inline" items={LowerMenuItems} />
            </Flex>
          </Flex>
        </Sider>
        <Layout>
          <Content>{children}</Content>
        </Layout>
      </Layout>
    </StyleProvider>
  );
};

export default AppLayout;
