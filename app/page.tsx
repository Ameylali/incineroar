import { Layout } from 'antd';
import { Content } from 'antd/lib/layout/layout';

import Welcome from '@/src/components/Welcome';

const Home = () => {
  return (
    <Layout>
      <Content className="h-dvh">
        <Welcome />
      </Content>
    </Layout>
  );
};

export default Home;
