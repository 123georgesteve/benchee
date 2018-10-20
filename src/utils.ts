// constants
import { DEFAULT_OPTIONS, UNGROUPED_NAME } from './constants';

/**
 * create a test object based on the name, group, and fn passed
 * @param name the name of the test
 * @param testGroup either the test function, or the group the test lives in
 * @param testFn the test function (only when a group is specified)
 */
export const createTest = (
  name: string,
  testGroup: string | Function,
  testFn?: Function,
): Benchee.Test => ({
  fn: typeof testGroup === 'function' ? testGroup : testFn,
  group: typeof testGroup === 'string' ? testGroup : UNGROUPED_NAME,
  iterations: 0,
  name,
});

/**
 * get the options passed merged with the defaults
 * @param passedOptions the options passed to merge
 * @returns the merged options
 */
export const getOptions = (passedOptions?: Benchee.Options): Benchee.Options =>
  passedOptions && typeof passedOptions === 'object'
    ? { ...DEFAULT_OPTIONS, ...passedOptions }
    : { ...DEFAULT_OPTIONS };

/**
 * sort the results by operations per second (descending)
 * @param results the results to sort
 * @returns the sorted results
 */
export const sortResults = (results: Benchee.Result[]): Benchee.Result[] =>
  results.sort((a: Benchee.Result, b: Benchee.Result): number => {
    if (a.stats.ops > b.stats.ops) {
      return -1;
    }

    if (a.stats.ops < b.stats.ops) {
      return 1;
    }

    return 0;
  });

/**
 * wait the period of time passed (defaulting to 0)
 * @param delay the time to wait before resolving
 * @returns the promise that is resolved after the delay
 */
export const wait = (delay: number = 0): Promise<any> =>
  new Promise((resolve) => setTimeout(resolve, delay));