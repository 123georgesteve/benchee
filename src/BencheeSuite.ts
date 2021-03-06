// utils
import { createBenchmark, getOptions, sortResults, wait } from './utils';

class BencheeSuite implements BencheeSuite {
  benchmarks: Benchee.BenchmarkGroup;
  isRunning: boolean;
  options: Benchee.Options;
  results: Benchee.Results;

  constructor(passedOptions?: Benchee.Options) {
    this.benchmarks = {};
    this.isRunning = false;
    this.options = getOptions(passedOptions);
    this.results = {};
  }

  /**
   * when a benchmark finishes, store the result
   * @param benchmark the benchmark object that was just processed
   * @param stats the statistics of the benchmark execution
   */
  _onResult(benchmark: Benchee.Benchmark, stats: Benchee.Stats): void {
    const {
      benchmarks,
      options: { onComplete, onGroupComplete, onResult },
      results,
    } = this;

    const result: Benchee.Result = {
      stats,
      name: benchmark.name,
    };

    results[benchmark.group].push(result);

    if (typeof onResult === 'function') {
      onResult(result);
    }

    if (
      typeof onGroupComplete === 'function' &&
      !benchmarks[benchmark.group].length
    ) {
      onGroupComplete({
        group: benchmark.group,
        results: sortResults(results[benchmark.group]),
      });
    }

    if (typeof onComplete === 'function') {
      for (const group in benchmarks) {
        if (benchmarks[group].length) {
          return;
        }
      }

      onComplete(results);
    }
  }

  /**
   * run the benchmark with the options passed
   * @param benchmarkOptions the options for the given benchmark
   */
  async _runBenchmark(
    benchmarkOptions: Benchee.BenchmarkOptions,
  ): Promise<void> {
    const {
      options: { minIterations, minTime, type },
    } = this;
    const {
      benchmark,
      iterations = minIterations,
      startTime = Date.now(),
    } = benchmarkOptions;

    let pending: number = iterations;

    try {
      while (pending--) {
        benchmark.fn();
        benchmark.iterations++;
      }

      const endTime: number = Date.now();
      const elapsed: number = Math.max(endTime - startTime, 1);

      if (type !== 'fixed' && elapsed < minTime) {
        await wait();
        await this._runBenchmark({
          benchmark,
          startTime,
          iterations: ~~(((iterations * minTime) / elapsed) * 0.9),
        });

        return;
      }

      const elapsedInSeconds: number = elapsed / 1000;

      this._onResult(benchmark, {
        elapsed,
        endTime,
        startTime,
        iterations: benchmark.iterations,
        ops: ~~(benchmark.iterations / elapsedInSeconds),
        tpe: elapsed / benchmark.iterations,
      });
    } catch (error) {
      const endTime: number = Date.now();
      const elapsed: number = endTime - startTime;

      this._onResult(benchmark, {
        elapsed,
        endTime,
        startTime,
        iterations: benchmark.iterations,
        ops: 0,
        tpe: 0,
      });
    }
  }

  /**
   * run a group of benchmarks
   * @param groupBenchmarks the benchmarks for the given group
   * @param group the name of the group being run
   */
  async _runGroup(
    groupBenchmarks: Benchee.Benchmark[],
    group?: string,
  ): Promise<void> {
    if (!groupBenchmarks.length) {
      return Promise.resolve();
    }

    const {
      options: { delay, onGroupStart },
    } = this;

    if (group && typeof onGroupStart === 'function') {
      onGroupStart(group);
    }

    while (groupBenchmarks.length) {
      await wait(delay);
      await this._runBenchmark({ benchmark: groupBenchmarks.shift() });
    }
  }

  /**
   * add a benchmark to the queue to be run
   * @param name the name of the benchmark
   * @param benchmarkGroup the group the benchmark is in, or the benchmark function itself
   * @param benchmarkFn the benchmark function (only when group is provided)
   */
  add(
    name: string,
    benchmarkGroup: string | Function,
    benchmarkFn?: Function,
  ): BencheeSuite {
    const { benchmarks, results } = this;

    const benchmark: Benchee.Benchmark = createBenchmark(
      name,
      benchmarkGroup,
      benchmarkFn,
    );
    const { group } = benchmark;

    if (!benchmarks[group]) {
      benchmarks[group] = [];
      results[group] = [];
    }

    benchmarks[group].push(benchmark);

    return this;
  }

  /**
   * run the benchmarks in the queue
   */
  async run(): Promise<Benchee.Results> {
    const { benchmarks, isRunning, results } = this;

    if (isRunning) {
      throw new Error('Benchee is already running.');
    }

    this.isRunning = true;

    for (const group in benchmarks) {
      await this._runGroup(benchmarks[group], group);
    }

    this.isRunning = false;

    return results;
  }
}

export default BencheeSuite;
