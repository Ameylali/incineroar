import { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RedirectProps {
  route: Route;
  replace?: boolean;
}

const Redirect = ({ route, replace }: RedirectProps) => {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }, [router, route, replace]);
  return null;
};

export default Redirect;
