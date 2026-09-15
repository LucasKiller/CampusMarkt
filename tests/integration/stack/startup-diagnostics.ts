type ComposeResult = {
  status: number | null;
  stderr: string;
  stdout: string;
};

type ComposeRunner = (arguments_: string[]) => ComposeResult;

const maximumDiagnosticLength = 20_000;

function output(result: ComposeResult) {
  return `${result.stderr}${result.stdout}`.trim();
}

export function captureStartupDiagnostic(
  failure: ComposeResult,
  compose: ComposeRunner,
) {
  const status = compose(["ps", "--all"]);
  const logs = compose([
    "logs",
    "--no-color",
    "--tail",
    "80",
    "storage",
    "api-gw",
    "db",
  ]);
  return [
    "Compose startup failed.",
    output(failure),
    "Service status:",
    output(status),
    "Bounded dependency logs:",
    output(logs),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, maximumDiagnosticLength);
}
