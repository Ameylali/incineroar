import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { UserKeys } from '../constants/query-keys';
import { User } from '../types/api';

const getUser = async (): Promise<User> => {
  const result = await axios.get<{ user: User }>('/api/user/me');
  return result.data.user;
};

const useUserQuery = () => {
  return useQuery({
    queryKey: UserKeys.me(),
    queryFn: getUser,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export default useUserQuery;
