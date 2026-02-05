import { findTournamentData } from '@/src/actions/scrap';
import DBConnection from '@/src/db/DBConnection';

const main = async () => {
  await findTournamentData();
};

main()
  .then(() => console.log('Done'))
  .catch((err) => console.error('Failed', err))
  .finally(async () => await DBConnection.close());
