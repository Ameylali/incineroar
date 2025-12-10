import { Col, Row } from 'antd';
import Text from 'antd/es/typography/Text';

import { type Action } from '@/src/types/api';

interface ActionProps {
  action: Action;
}

const Action = ({ action }: ActionProps) => {
  const getActionLabel = () => {
    switch (action.type) {
      case 'move':
        return `used ${action.name} against`;
      case 'switch':
        return 'switched to';
      case 'ability':
        return `${action.name} to`;
      case 'effect':
        return `${action.name} to`;
    }
  };
  const getUserLabel = () => {
    return (
      action.user +
      (action.type === 'ability' || action.type === 'effect' ? "'s" : '')
    );
  };
  return (
    <Row>
      <Col span={1}>
        <Text>{`${action.index}.`}</Text>
      </Col>
      <Col span={7}>
        <Text>{getUserLabel()}</Text>
      </Col>
      <Col span={9}>
        <Text>{getActionLabel()}</Text>
      </Col>
      <Col span={7}>
        <ul>
          {action.targets.map((val, index) => (
            <li key={index}>{val}</li>
          ))}
        </ul>
      </Col>
    </Row>
  );
};

export default Action;
