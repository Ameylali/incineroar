'use client';

import { Col, Row, Table } from 'antd';

import { useTournamentsQuery } from '@/src/hooks/tournament-queries';
import { usePagination } from '@/src/hooks/usePagination';
import { Tournament } from '@/src/types/api';
import { withKeys } from '@/src/utils/antd-adapters';

import { TOURNAMENT_COLUMNS } from './components/TournamentColumns';

const TournamentsTable = Table<Tournament>;

const Page = () => {
  const { paginationParams, handleTableChange, paginationProps } =
    usePagination<Tournament>();
  const { isLoading, data } = useTournamentsQuery(paginationParams);

  return (
    <>
      <Row>
        <Col span={24}>
          <TournamentsTable
            loading={isLoading}
            columns={TOURNAMENT_COLUMNS}
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
