import { TableProps } from 'antd';
import Link from 'next/link';

import { Tournament } from '@/src/types/api';

export const TOURNAMENT_COLUMNS: TableProps<Tournament>['columns'] = [
  {
    title: 'Tournament',
    dataIndex: 'name',
    key: 'name',
    render: (name, { id }) => <Link href={`/home/metagame/${id}`}>{name}</Link>,
  },
  {
    title: 'Season',
    dataIndex: 'season',
    key: 'season',
  },
  {
    title: 'Format',
    dataIndex: 'format',
    key: 'format',
  },
];
