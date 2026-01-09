import DBConnection from '@/src/db/DBConnection';
import UserRepository, { UserAlreadyExistsError } from '@/src/db/models/user';
import { SignUpData, User } from '@/src/types/api';

const baseUsersPasswords: Record<string, string | undefined> = JSON.parse(
  process.env.BASE_USERS_PASSWORDS_MAP ?? '{}',
) as Record<string, string | undefined>;

const BaseUsers: (SignUpData & { role: User['role'] })[] = [
  {
    username: 'arceus',
    password: baseUsersPasswords['arceus'] ?? '',
    role: 'admin',
  },
  {
    username: 'mew',
    password: baseUsersPasswords['mew'] ?? '',
    role: 'admin',
  },
  {
    username: 'mewtwo',
    password: baseUsersPasswords['mewtwo'] ?? '',
    role: 'user',
  },
];

const main = async () => {
  await DBConnection.connect();
  const userRepo = new UserRepository();

  console.log('Creating users...');
  for (const { username, password, role } of BaseUsers) {
    try {
      if (password === '') {
        console.warn(`Skipping user ${username} due to empty password`);
        continue;
      }
      const createdUser = await userRepo.create({ username, password }, role);
      console.log(`Created user ${createdUser.username}`);
    } catch (err) {
      if (err instanceof UserAlreadyExistsError) {
        console.warn(`Skipping user ${username} because it already exists`);
        continue;
      }
      console.error(`Failed to create user ${username}`, err);
    }
  }
  console.log('Created users');
  await DBConnection.close();
};

main()
  .then(() => console.log('Done'))
  .catch((err) => console.error('Failed', err));
