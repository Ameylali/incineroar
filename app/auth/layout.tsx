import { Layout } from 'antd';
import { Content } from 'antd/lib/layout/layout';

const LoginLayout = ({ children }: LayoutProps<'/auth'>) => {
  return (
    <Layout>
      <Content className="h-dvh p-5">{children}</Content>
    </Layout>
  );
};

export default LoginLayout;
