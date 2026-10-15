/**
 * Loaded before every `bun test` run (bunfig.toml). Stops the whole test run
 * when the environment points at production resources.
 */
import { assertNoProductionEnvironment } from "@grabbin/env/prod-guard";

assertNoProductionEnvironment();
