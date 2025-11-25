'use client';

import { Breadcrumb, Col, Flex, Row } from 'antd';
import { PropsWithChildren } from 'react';

import useBreadcrumbs from '@/src/hooks/useBreadcrumbs';

const Layout = ({ children }: PropsWithChildren) => {
  const breadcrumbs = useBreadcrumbs();

  return (
    <Flex vertical gap={30} className="h-full">
      <section>
        <Row>
          <Col>
            <Breadcrumb items={breadcrumbs} />
          </Col>
        </Row>
      </section>
      <section className="overflow-y-auto">{children}</section>
    </Flex>
  );
};

export default Layout;
