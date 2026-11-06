import { expect, it } from "vitest";

import {
  advanceBoxCalibration,
  boxPointer,
  calibrationPoints,
  fitBoxCalibration,
  mapCalibratedPoint,
  startBoxCalibration,
  type BoxCalibrationUpdate,
} from "./eye-tracker";

it("keeps the virtual pointer inside the camera box", () => {
  expect(boxPointer({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
  expect(boxPointer({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 });
});

it("calibrates reversed eye axes from four box corners", () => {
  const calibration = fitBoxCalibration([
    { raw: { x: 0.8, y: 0.7 }, target: calibrationPoints[0] },
    { raw: { x: 0.2, y: 0.7 }, target: calibrationPoints[1] },
    { raw: { x: 0.2, y: 0.3 }, target: calibrationPoints[2] },
    { raw: { x: 0.8, y: 0.3 }, target: calibrationPoints[3] },
  ]);

  expect(calibration).toBeTruthy();
  const middle = mapCalibratedPoint({ x: 0.5, y: 0.5 }, calibration!);
  expect(middle.x).toBeCloseTo(0.5, 6);
  expect(middle.y).toBeCloseTo(0.5, 6);
  expect(mapCalibratedPoint({ x: 2, y: -2 }, calibration!)).toEqual({ x: 0, y: 1 });
});

it("holds at each corner and keeps its median eye point", () => {
  let session = startBoxCalibration(0);
  for (const point of [
    { x: 0.9, y: 0.8 },
    { x: 0.8, y: 0.7 },
    { x: 0.7, y: 0.6 },
  ]) {
    session = advanceBoxCalibration(session, point, 700).session;
  }
  const update = advanceBoxCalibration(session, { x: 0.8, y: 0.7 }, 1_800);

  expect(update.outcome).toBe("advanced");
  expect(update.session.index).toBe(1);
  expect(update.session.pairs[0]).toEqual({
    raw: { x: 0.8, y: 0.7 },
    target: calibrationPoints[0],
  });
});

it("makes a box calibration from four completed holds", () => {
  const rawPoints = [
    { x: 0.8, y: 0.7 },
    { x: 0.2, y: 0.7 },
    { x: 0.2, y: 0.3 },
    { x: 0.8, y: 0.3 },
  ];
  let session = startBoxCalibration(0);
  let update: BoxCalibrationUpdate | undefined;

  rawPoints.forEach((point, index) => {
    const start = index * 1_800;
    session = advanceBoxCalibration(session, point, start + 600).session;
    session = advanceBoxCalibration(session, point, start + 900).session;
    session = advanceBoxCalibration(session, point, start + 1_200).session;
    update = advanceBoxCalibration(session, point, start + 1_800);
    session = update.session;
  });

  expect(update?.outcome).toBe("complete");
  const middle = mapCalibratedPoint({ x: 0.5, y: 0.5 }, update!.calibration!);
  expect(middle.x).toBeCloseTo(0.5, 6);
  expect(middle.y).toBeCloseTo(0.5, 6);
});
