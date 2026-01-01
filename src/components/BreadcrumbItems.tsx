import { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useTeamQuery } from '../hooks/team-queries';
import { useTournamentQuery } from '../hooks/tournament-queries';
import { useBattleQuery, useTrainingQuery } from '../hooks/training-queries';

export interface CustomBreadcrumbItemProps {
  section: string;
  currPath?: Route;
}

export const TeamIdItem = ({
  section,
  currPath,
}: CustomBreadcrumbItemProps) => {
  const { data } = useTeamQuery(section);
  if (currPath) {
    return <Link href={currPath}>{data.name}</Link>;
  }
  return <>{data.name}</>;
};

export const MetagameIdItem = ({
  section,
  currPath,
}: CustomBreadcrumbItemProps) => {
  const { data } = useTournamentQuery(section);
  if (currPath) {
    return <Link href={currPath}>{data.tournament.name}</Link>;
  }
  return <>{data.tournament.name}</>;
};

export const TrainingIdItem = ({
  section,
  currPath,
}: CustomBreadcrumbItemProps) => {
  const { data } = useTrainingQuery(section);
  if (currPath) {
    return <Link href={currPath}>{data.training.name}</Link>;
  }
  return <>{data.training.name}</>;
};

export const BattleIdItem = ({
  section,
  currPath,
}: CustomBreadcrumbItemProps) => {
  const [, , trainingId] = usePathname()
    .split('/')
    .filter((val) => val !== '');
  const { data } = useBattleQuery(trainingId, section);
  if (currPath) {
    return <Link href={currPath}>{data.battle.name}</Link>;
  }
  return <>{data.battle.name}</>;
};
