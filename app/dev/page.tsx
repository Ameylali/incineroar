/* eslint-disable @typescript-eslint/no-misused-promises */

import { testTeamsRepository } from './actions';

const Page = () => {
  return (
    <button onClick={testTeamsRepository}>
      Click me to test teamRepository
    </button>
  );
};

export default Page;
