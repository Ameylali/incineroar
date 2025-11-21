'use client';

import { MoreOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Col, Dropdown, Row, Table, TableProps } from 'antd';
import Link from 'next/link';
import { useMemo } from 'react';

import useUserQuery from '@/src/hooks/useUserQuery';
import { Team } from '@/src/types/api';

import TeamPreview from './components/TeamPreview';

const TeamsTable = Table<Team>;

const ActionsMenu = () => {
  return (
    <Dropdown
      menu={{
        items: [
          { label: 'Edit', key: 'edit' },
          { label: 'Delete', key: 'delete' },
        ],
      }}
    >
      <Button shape="circle" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

const COLUMNS: TableProps<Team>['columns'] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (name, { id }) => <Link href={`/home/teams/${id}`}>{name}</Link>,
  },
  {
    title: 'Season',
    dataIndex: 'season',
    key: 'season',
  },
  {
    title: 'Regulation',
    dataIndex: 'regulation',
    key: 'regulation',
  },
  {
    title: 'Preview',
    dataIndex: 'parsedTeam',
    key: 'preview',
    render: (team: Team['parsedTeam']) => <TeamPreview team={team} />,
  },
  {
    title: 'Actions',
    key: 'acions',
    render: () => <ActionsMenu />,
  },
];

const Page = () => {
  const { isLoading, isError, data } = useUserQuery();
  const teams = useMemo(() => {
    return (data?.teams ?? []).map((team) => {
      const parsedTeam = {
        key: team.id,
        ...team,
      };
      return parsedTeam;
    });
  }, [data]);

  if (isError) {
    return <h1>Error</h1>;
  }

  return (
    <>
      <Row className="mb-3">
        <Col>
          <Button type="primary" icon={<PlusCircleOutlined />}>
            Import team
          </Button>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <TeamsTable
            loading={isLoading}
            columns={COLUMNS}
            dataSource={teams}
          />
        </Col>
      </Row>
    </>
  );
};

export default Page;
