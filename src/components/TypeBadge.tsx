import { Tag } from 'antd';

interface TypeBadgeProps {
  type?: string;
  isTera?: boolean;
}

const TypeBadge = ({ type }: TypeBadgeProps) => {
  return <Tag>{type || 'unknown'}</Tag>;
};

export default TypeBadge;
