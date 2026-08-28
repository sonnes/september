import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceBoxCalibration,
  boxPointer,
  calibrationPoints,
  fitBoxCalibration,
  mapCalibratedPoint,
  startBoxCalibration,
} from "../src/rules/eye-tracker.ts";

test("the virtual pointer cannot leave the camera box", () => {
  assert.deepEqual(boxPointer({ x: -0.2, y: 1.4 }), { x: 0, y: 1 });
  assert.deepEqual(boxPointer({ x: 0.25, y: 0.75 }), { x: 0.25, y: 0.75 });
});

test("four box corners calibrate reversed eye axes", () => {
  const calibration = fitBoxCalibration([
    { raw: { x: 0.8, y: 0.7 }, target: calibrationPoints[0] },
    { raw: { x: 0.2, y: 0.7 }, target: calibrationPoints[1] },
    { raw: { x: 0.2, y: 0.3 }, target: calibrationPoints[2] },
    { raw: { x: 0.8, y: 0.3 }, target: calibrationPoints[3] },
  ]);

  assert.ok(calibration);
  const middle = mapCalibratedPoint({ x: 0.5, y: 0.5 }, calibration);
  assert.ok(Math.abs(middle.x - 0.5) < 0.000001);
  assert.ok(Math.abs(middle.y - 0.5) < 0.000001);
  assert.deepEqual(mapCalibratedPoint({ x: 2, y: -2 }, calibration), {
    x: 0,
    y: 1,
  });
});

test("calibration holds at each corner and uses its median eye point", () => {
  let session = startBoxCalibration(0);
  for (const point of [
    { x: 0.9, y: 0.8 },
    { x: 0.8, y: 0.7 },
    { x: 0.7, y: 0.6 },
  ]) {
    session = advanceBoxCalibration(session, point, 700).session;
  }
  const update = advanceBoxCalibration(session, { x: 0.8, y: 0.7 }, 1_800);

  assert.equal(update.outcome, "advanced");
  assert.equal(update.session.index, 1);
  assert.deepEqual(update.session.pairs[0], {
    raw: { x: 0.8, y: 0.7 },
    target: calibrationPoints[0],
  });
});

test("four completed holds produce a box calibration", () => {
  const rawPoints = [
    { x: 0.8, y: 0.7 },
    { x: 0.2, y: 0.7 },
    { x: 0.2, y: 0.3 },
    { x: 0.8, y: 0.3 },
  ];
  let session = startBoxCalibration(0);
  let update;

  rawPoints.forEach((point, index) => {
    const start = index * 1_800;
    session = advanceBoxCalibration(session, point, start + 600).session;
    session = advanceBoxCalibration(session, point, start + 900).session;
    session = advanceBoxCalibration(session, point, start + 1_200).session;
    update = advanceBoxCalibration(session, point, start + 1_800);
    session = update.session;
  });

  assert.equal(update.outcome, "complete");
  assert.ok(update.calibration);
  const middle = mapCalibratedPoint({ x: 0.5, y: 0.5 }, update.calibration);
  assert.ok(Math.abs(middle.x - 0.5) < 0.000001);
  assert.ok(Math.abs(middle.y - 0.5) < 0.000001);
});
