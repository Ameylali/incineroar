'use client';

import { BreadcrumbProps } from 'antd';
import { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useMemo } from 'react';

import {
  BattleIdItem,
  CustomBreadcrumbItemProps,
  MetagameIdItem,
  TeamIdItem,
  TrainingIdItem,
} from '../components/BreadcrumbItems';
import { capitalize } from '../utils/string';

const removeTrailingSlash = (val: string) =>
  val.endsWith('/') ? val.substring(0, val.length - 1) : val;

const matchesPathname = (asPath: string, pathname: string) => {
  if (asPath === pathname) {
    return true;
  }
  const baseAsPath = removeTrailingSlash(asPath.split('?')[0]);
  const basePathname = removeTrailingSlash(pathname.split('?')[0]);
  if (baseAsPath === basePathname) {
    return true;
  }
  const basePathRegex = new RegExp(
    `^${basePathname.replace(/(\[[a-zA-Z0-9-]+\])+/g, '[a-zA-Z0-9-]+')}$`
      .replace(/\[\[\.\.\.[a-zA-Z0-9-]+\]\]/g, '?.*')
      .replace(/\[\.\.\.[a-zA-Z0-9-]+\]/g, '.*'),
  );
  return basePathRegex.test(baseAsPath);
};

type BreadcrumbBuilder = (
  pathname: string,
) => Exclude<BreadcrumbProps['items'], undefined>;
type BreadcrumItemOverrideMap = {
  [index: number]: React.FC<CustomBreadcrumbItemProps>;
};

const SimpleBreadcrumbs = (
  pathname: string,
  overridesMap?: BreadcrumItemOverrideMap,
) => {
  const sections = pathname.split('/').filter((val) => val !== '');
  return sections.map((section, index) => {
    const sections2 = [...sections];
    const prevPath = '/' + sections2.splice(0, index).join('/');
    const currPath =
      prevPath.length > 1 ? `${prevPath}/${section}` : `${prevPath}${section}`;
    if (overridesMap && overridesMap[index]) {
      const OverrideComponent = overridesMap[index];
      return {
        title: (
          <OverrideComponent
            section={section}
            currPath={
              index + 1 === sections.length ? undefined : (currPath as Route)
            }
          />
        ),
        key: section,
      };
    }
    return {
      title:
        index + 1 === sections.length
          ? getTitle(section)
          : getItem(section, currPath as Route),
      key: section,
    };
  });
};

const PATHS_TO_BUILDER_MAP: { [key: string]: BreadcrumbBuilder } = {
  '/home/teams': SimpleBreadcrumbs,
  '/home/teams/[id]': (pathname) =>
    SimpleBreadcrumbs(pathname, { 2: TeamIdItem }),
  '/home/metagame': SimpleBreadcrumbs,
  '/home/metagame/[id]': (pathname) =>
    SimpleBreadcrumbs(pathname, { 2: MetagameIdItem }),
  '/home/training': SimpleBreadcrumbs,
  '/home/training/[trainingId]': (pathname) =>
    SimpleBreadcrumbs(pathname, { 2: TrainingIdItem }),
  '/home/training/[trainingId]/[battleId]': (pathname) =>
    SimpleBreadcrumbs(pathname, { 2: TrainingIdItem, 3: BattleIdItem }),
  '/home/training/[trainingId]/analyze': (pathname) =>
    SimpleBreadcrumbs(pathname, { 2: TrainingIdItem }),
};
const getBreadcrumbs = (pathname: string) => {
  for (const asPath in PATHS_TO_BUILDER_MAP) {
    if (matchesPathname(pathname, asPath) && asPath in PATHS_TO_BUILDER_MAP) {
      return PATHS_TO_BUILDER_MAP[asPath];
    }
  }
  return SimpleBreadcrumbs;
};

const ITEMS: { [key: string]: string } = {
  teams: 'My teams',
};

const getTitle = (section: string) => {
  if (section in ITEMS) {
    return ITEMS[section as keyof typeof ITEMS];
  }
  return capitalize(section);
};

const getItem = (section: string, path: Route) => (
  <Link href={path}>{getTitle(section)}</Link>
);

const useBreadcrumbs = () => {
  const pathname = usePathname();
  const breadcrumbs: BreadcrumbProps['items'] = useMemo(() => {
    const builder = getBreadcrumbs(pathname);
    return builder(pathname);
  }, [pathname]);

  return breadcrumbs;
};

export default useBreadcrumbs;
