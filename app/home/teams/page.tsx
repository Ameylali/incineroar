'use client';

import { MoreOutlined } from '@ant-design/icons';
import { Button, Col, Dropdown, Row, Table, TableProps } from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useDeleteTeamMutation } from '@/src/hooks/team-mutations';
import useUserQuery from '@/src/hooks/useUserQuery';
import { Team } from '@/src/types/api';

import { EditTeamModal, ImportTeamModal } from './components/TeamModals';
import TeamPreview from './components/TeamPreview';

const TeamsTable = Table<Team>;

interface ActionsMenuProps {
  team: Team;
  onEdit: (team: Team) => void;
}

const ActionsMenu = ({ team, onEdit }: ActionsMenuProps) => {
  const { mutate } = useDeleteTeamMutation(team.id);
  return (
    <Dropdown
      menu={{
        items: [
          { label: 'Edit', key: 'edit', onClick: () => onEdit(team) },
          { label: 'Delete', key: 'delete', onClick: () => mutate() },
        ],
      }}
    >
      <Button shape="circle" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

const Page = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditTeam(null);
  };

  const onEdit = (team: Team) => {
    setEditTeam(team);
    setIsEditModalOpen(true);
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
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
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
      render: (_, team) => <ActionsMenu team={team} onEdit={onEdit} />,
    },
  ];
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
          <ImportTeamModal />
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
      {editTeam && (
        <EditTeamModal
          isOpen={isEditModalOpen}
          closeModal={closeModal}
          team={editTeam}
        />
      )}
    </>
  );
};

export default Page;
