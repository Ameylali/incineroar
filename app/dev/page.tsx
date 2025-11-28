/* eslint-disable @typescript-eslint/no-misused-promises */

import {
  testAnalyzeTournament,
  testCreateTournament,
  testDeleteTournament,
  testTeamsRepository,
} from './actions';

const Page = () => {
  return (
    <div className="flex flex-col">
      <button onClick={testTeamsRepository}>
        Click me to test teamRepository
      </button>
      <button onClick={testCreateTournament}>
        Click me to test createTournament
      </button>
      <form className="flex flex-row" action={testDeleteTournament}>
        <input id="delete-t-input" name="id" />
        <button type="submit">Click me to test deleteTournament</button>
      </form>
      <button onClick={testAnalyzeTournament}>
        Click me to test analyze tournament
      </button>
    </div>
  );
};

export default Page;
