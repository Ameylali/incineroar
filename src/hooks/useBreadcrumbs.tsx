'use client';

import { BreadcrumbProps } from 'antd';
import { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { capitalize } from '../utils/string';

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
    const sections = pathname.split('/').filter((val) => val !== '');
    return sections.map((section, index) => {
      const sections2 = [...sections];
      const prevPath = '/' + sections2.splice(0, index).join('/');
      const currPath =
        prevPath.length > 1
          ? `${prevPath}/${section}`
          : `${prevPath}${section}`;
      return {
        title:
          index + 1 === sections.length
            ? getTitle(section)
            : getItem(section, currPath as Route),
        key: section,
      };
    });
  }, [pathname]);

  return breadcrumbs;
};

export default useBreadcrumbs;
