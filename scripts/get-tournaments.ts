import { importTournamentData } from '@/src/actions/scrap';
import DBConnection from '@/src/db/DBConnection';

const main = async () => {
  await importTournamentData();
};

main()
  .then(() => console.log('Done'))
  .catch((err) => console.error('Failed', err))
  .finally(async () => await DBConnection.close());
