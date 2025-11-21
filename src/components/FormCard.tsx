import { Card, Col, Row } from 'antd';
import Title from 'antd/lib/typography/Title';
import { PropsWithChildren } from 'react';

interface FormCardProps extends PropsWithChildren {
  title: string;
}

const FormCard = ({ title, children }: FormCardProps) => {
  return (
    <Card>
      <Row justify="center">
        <Col span={24}>
          <Title>{title}</Title>
        </Col>
      </Row>
      <Row></Row>
      <Row justify="center">
        <Col span={24}>{children}</Col>
      </Row>
    </Card>
  );
};

export default FormCard;
