'use client';

import { Col, Row, Table } from 'antd';

import { useTournamentsQuery } from '@/src/hooks/tournament-queries';
import { Tournament } from '@/src/types/api';
import { withKeys } from '@/src/utils/antd-adapters';

import { TOURNAMENT_COLUMNS } from './components/TournamentColumns';

const TournamentsTable = Table<Tournament>;

const Page = () => {
  const { isLoading, data } = useTournamentsQuery();

  return (
    <>
      <Row>
        <Col span={24}>
          <TournamentsTable
            loading={isLoading}
            columns={TOURNAMENT_COLUMNS}
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
