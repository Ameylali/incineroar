import { Col, Row } from 'antd';

import AddTournament from './components/AddTournament';

const Page = () => {
  return (
    <>
      <Row>
        <Col>
          <AddTournament />
        </Col>
      </Row>
    </>
  );
};

export default Page;
