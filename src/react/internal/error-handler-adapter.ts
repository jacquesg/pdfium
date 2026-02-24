import type { Dispatch, SetStateAction } from 'react';

type ErrorStateSetter = Dispatch<SetStateAction<Error | null>>;

function createErrorStateHandler(setError: ErrorStateSetter): (error: Error) => void {
  return (error: Error) => {
    setError(error);
  };
}

export { createErrorStateHandler };
export type { ErrorStateSetter };
