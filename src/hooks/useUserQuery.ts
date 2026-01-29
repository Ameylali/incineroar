import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

import { UserKeys } from '../constants/query-keys';
import { GET_ME } from '../types/endpoints';

const getUser = async () => {
  const result = await axios.get<GET_ME>(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/user/me`,
  );
  return result.data.user;
};

const queryOptions = {
  queryKey: UserKeys.me(),
  queryFn: getUser,
};

export const useClientUserQuery = () => {
  return useQuery({
    ...queryOptions,
  });
};

const useUserQuery = () => {
  return useSuspenseQuery({
    ...queryOptions,
  });
};

export default useUserQuery;
