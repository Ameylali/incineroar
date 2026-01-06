'use client';

import { DeleteOutlined } from '@ant-design/icons';
import { Button, Col, Row, Table, TableProps } from 'antd';
import Link from 'next/link';

import {
  useDeleteTournamentMutation,
  useTournamentsQuery,
} from '@/src/hooks/tournament-queries';
import { Tournament } from '@/src/types/api';
import { withKeys } from '@/src/utils/antd-adapters';

import AddTournament from './components/AddTournament';

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
  {
    title: 'Actions',
    key: 'acions',
    render: (_, tournament) => <ActionsMenu tournament={tournament} />,
  },
];

const Page = () => {
  const { isLoading, data } = useTournamentsQuery();

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
            dataSource={withKeys(
              data.tournaments.sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              ),
            )}
          />
        </Col>
      </Row>
    </>
  );
};

export default Page;
