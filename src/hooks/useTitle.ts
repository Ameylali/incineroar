import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';

const DEFAULT_TITLE = 'FakeOut Labs';

const ROUTE_TO_TITLE = {
  '/home/teams': `Teams - ${DEFAULT_TITLE}`,
  '/home/metagame': `Metagame - ${DEFAULT_TITLE}`,
  '/home/training': `Training - ${DEFAULT_TITLE}`,
};

const useTitle = () => {
  const pathname = usePathname();
  const title = useMemo(() => {
    let title = DEFAULT_TITLE;
    for (const path in ROUTE_TO_TITLE) {
      if (pathname.startsWith(path)) {
        title = ROUTE_TO_TITLE[path as keyof typeof ROUTE_TO_TITLE];
        break;
      }
    }
    return title;
  }, [pathname]);

  useEffect(() => {
    document.title = title;
  }, [pathname, title]);
};

export default useTitle;
