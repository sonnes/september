export type GazePoint = { x: number; y: number };

export const calibrationPoints: readonly GazePoint[] = [
  { x: 0.12, y: 0.15 },
  { x: 0.88, y: 0.15 },
  { x: 0.88, y: 0.85 },
  { x: 0.12, y: 0.85 },
];

const CALIBRATION_SETTLE_MS = 500;
const CALIBRATION_HOLD_MS = 1_200;
const MIN_CALIBRATION_SAMPLES = 3;

type AxisCalibration = { slope: number; intercept: number };

export type BoxCalibration = {
  x: AxisCalibration;
  y: AxisCalibration;
};

export type CalibrationPair = {
  raw: GazePoint;
  target: GazePoint;
};

export type BoxCalibrationSession = {
  index: number;
  startedAt: number;
  samples: GazePoint[];
  pairs: CalibrationPair[];
};

export type BoxCalibrationUpdate = {
  session: BoxCalibrationSession;
  calibration: BoxCalibration | null;
  outcome: "sampling" | "advanced" | "retry" | "complete" | "invalid";
};

export function boxPointer(point: GazePoint): GazePoint {
  // ponytail: the box is the whole coordinate system; clipping is the only
  // boundary rule this test bed needs.
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

function fitAxis(
  pairs: CalibrationPair[],
  raw: (point: GazePoint) => number,
  target: (point: GazePoint) => number,
): AxisCalibration | null {
  const rawMean = pairs.reduce((sum, pair) => sum + raw(pair.raw), 0) / pairs.length;
  const targetMean = pairs.reduce((sum, pair) => sum + target(pair.target), 0) / pairs.length;
  const variance = pairs.reduce(
    (sum, pair) => sum + (raw(pair.raw) - rawMean) ** 2,
    0,
  );
  if (variance < Number.EPSILON) return null;

  const covariance = pairs.reduce(
    (sum, pair) =>
      sum + (raw(pair.raw) - rawMean) * (target(pair.target) - targetMean),
    0,
  );
  const slope = covariance / variance;
  return { slope, intercept: targetMean - slope * rawMean };
}

export function fitBoxCalibration(pairs: CalibrationPair[]): BoxCalibration | null {
  if (pairs.length < calibrationPoints.length) return null;
  const x = fitAxis(pairs, (point) => point.x, (point) => point.x);
  const y = fitAxis(pairs, (point) => point.y, (point) => point.y);
  return x && y ? { x, y } : null;
}

export function mapCalibratedPoint(
  point: GazePoint,
  calibration: BoxCalibration,
): GazePoint {
  return boxPointer({
    x: calibration.x.slope * point.x + calibration.x.intercept,
    y: calibration.y.slope * point.y + calibration.y.intercept,
  });
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function medianPoint(points: GazePoint[]): GazePoint {
  return {
    x: median(points.map((point) => point.x)),
    y: median(points.map((point) => point.y)),
  };
}

export function startBoxCalibration(at: number): BoxCalibrationSession {
  return { index: 0, startedAt: at, samples: [], pairs: [] };
}

export function advanceBoxCalibration(
  session: BoxCalibrationSession,
  point: GazePoint | null,
  at: number,
): BoxCalibrationUpdate {
  const elapsed = at - session.startedAt;
  const samples = elapsed >= CALIBRATION_SETTLE_MS && point
    ? [...session.samples, point]
    : session.samples;

  if (elapsed < CALIBRATION_SETTLE_MS + CALIBRATION_HOLD_MS) {
    return { session: { ...session, samples }, calibration: null, outcome: "sampling" };
  }
  if (samples.length < MIN_CALIBRATION_SAMPLES) {
    return {
      session: { ...session, startedAt: at, samples: [] },
      calibration: null,
      outcome: "retry",
    };
  }

  const pairs = [
    ...session.pairs,
    { raw: medianPoint(samples), target: calibrationPoints[session.index] },
  ];
  if (session.index < calibrationPoints.length - 1) {
    return {
      session: { index: session.index + 1, startedAt: at, samples: [], pairs },
      calibration: null,
      outcome: "advanced",
    };
  }

  const calibration = fitBoxCalibration(pairs);
  return calibration
    ? {
        session: { ...session, samples, pairs },
        calibration,
        outcome: "complete",
      }
    : {
        session: startBoxCalibration(at),
        calibration: null,
        outcome: "invalid",
      };
}
