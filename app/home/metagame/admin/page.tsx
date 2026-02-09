'use client';

import { DeleteOutlined } from '@ant-design/icons';
import { Button, Col, Row, Table, TableProps } from 'antd';
import { redirect } from 'next/navigation';

import {
  useDeleteTournamentMutation,
  useTournamentsQuery,
} from '@/src/hooks/tournament-queries';
import { usePagination } from '@/src/hooks/usePagination';
import useUserQuery from '@/src/hooks/useUserQuery';
import { Tournament } from '@/src/types/api';
import { withKeys } from '@/src/utils/antd-adapters';

import AddTournament from '../components/AddTournament';
import { TOURNAMENT_COLUMNS } from '../components/TournamentColumns';

const TournamentsTable = Table<Tournament>;

interface ActionsMenuProps {
  tournament: Tournament;
}

const ActionsMenu = ({ tournament }: ActionsMenuProps) => {
  const { mutate } = useDeleteTournamentMutation(tournament.id);
  return (
    <Button shape="circle" icon={<DeleteOutlined />} onClick={() => mutate()} />
  );
};

const COLUMNS: TableProps<Tournament>['columns'] = [
  ...(TOURNAMENT_COLUMNS ?? []),
  {
    title: 'Actions',
    key: 'acions',
    render: (_, tournament) => <ActionsMenu tournament={tournament} />,
  },
];

const Page = () => {
  const { paginationParams, handleTableChange, paginationProps } =
    usePagination<Tournament>();
  const { isLoading, data } = useTournamentsQuery(paginationParams);
  const { data: user } = useUserQuery();

  if (user.role !== 'admin') {
    redirect('/home/metagame');
  }

  return (
    <>
      <Row className="mb-3">
        <Col>
          <AddTournament />
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <TournamentsTable
            loading={isLoading}
            columns={COLUMNS}
            dataSource={data ? withKeys(data.tournaments) : []}
            pagination={{
              ...paginationProps,
              total: data?.totalItems || 0,
            }}
            onChange={handleTableChange}
          />
        </Col>
      </Row>
    </>
  );
};

export default Page;
