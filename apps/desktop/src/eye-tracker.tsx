import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Crosshair, Play } from "lucide-react";

import { Screen } from "@september/app-ui/blocks/screen";
import { Badge } from "@september/ui/components/badge";
import { Button } from "@september/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@september/ui/components/card";

import {
  advanceBoxCalibration,
  calibrationPoints,
  mapCalibratedPoint,
  startBoxCalibration,
  type BoxCalibration,
  type BoxCalibrationSession,
} from "@/rules/eye-tracker";
import {
  startGaze,
  stopGaze,
  type GazeEvent,
  type GazeFrame,
} from "@/services/gaze";

type RunState = "off" | "starting" | "running" | "error";

function drawFeed(canvas: HTMLCanvasElement, frame: GazeFrame) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const binary = atob(frame.pixelsBase64);
  const rgba = Uint8ClampedArray.from(binary, (byte) => byte.charCodeAt(0));
  if (rgba.length !== frame.width * frame.height * 4) return;

  canvas.width = frame.width;
  canvas.height = frame.height;
  context.putImageData(new ImageData(rgba, frame.width, frame.height), 0, 0);
}

function CameraBox({
  calibration,
  calibrationIndex,
  frame,
}: {
  calibration: BoxCalibration | null;
  calibrationIndex: number | null;
  frame: GazeFrame | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = frame?.point && calibration
    ? mapCalibratedPoint(frame.point, calibration)
    : null;
  const target = calibrationIndex === null
    ? null
    : calibrationPoints[calibrationIndex];

  useEffect(() => {
    if (canvasRef.current && frame) drawFeed(canvasRef.current, frame);
  }, [frame]);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-surface border bg-zinc-950 shadow-sm">
      {frame ? (
        <canvas
          ref={canvasRef}
          aria-label="Live camera feed"
          className="size-full object-contain"
          role="img"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 text-center text-zinc-300">
          <Camera aria-hidden="true" className="size-8" />
          <p className="text-sm">Start the camera to test eye tracking.</p>
        </div>
      )}

      {pointer ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow-lg"
          data-testid="eye-pointer"
          style={{ left: `${pointer.x * 100}%`, top: `${pointer.y * 100}%` }}
        />
      ) : null}

      {target ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-indigo-600/80 shadow-lg"
          data-testid="calibration-target"
          style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
        >
          <span className="size-3 rounded-full bg-white" />
        </span>
      ) : null}
    </div>
  );
}

export function EyeTracker() {
  const [runState, setRunState] = useState<RunState>("off");
  const [status, setStatus] = useState("Camera is off.");
  const [frame, setFrame] = useState<GazeFrame | null>(null);
  const [calibration, setCalibration] = useState<BoxCalibration | null>(null);
  const [calibrationIndex, setCalibrationIndex] = useState<number | null>(null);
  const calibrationSession = useRef<BoxCalibrationSession | null>(null);

  const clearCalibration = useCallback(() => {
    calibrationSession.current = null;
    setCalibration(null);
    setCalibrationIndex(null);
  }, []);

  const stop = useCallback(async () => {
    setRunState("off");
    setStatus("Camera is off.");
    setFrame(null);
    clearCalibration();
    await stopGaze().catch((error: Error) => {
      setRunState("error");
      setStatus(error.message);
    });
  }, [clearCalibration]);

  const onEvent = useCallback((event: GazeEvent) => {
    if (event.event === "frame") {
      setFrame(event.data);
      const session = calibrationSession.current;
      if (!session) return;

      const update = advanceBoxCalibration(
        session,
        event.data.point,
        performance.now(),
      );
      if (update.outcome === "complete" && update.calibration) {
        calibrationSession.current = null;
        setCalibration(update.calibration);
        setCalibrationIndex(null);
        setStatus("Calibration complete. Move your eyes around the box.");
      } else {
        calibrationSession.current = update.session;
        setCalibrationIndex(update.session.index);
        if (update.outcome === "retry") {
          setStatus("Keep your face visible and hold your gaze on the dot.");
        } else if (update.outcome === "invalid") {
          setStatus("Your eye points were too similar. Calibration restarted.");
        }
      }
      return;
    }

    const { state, detail } = event.data;
    if (!(calibrationSession.current && state === "ready")) {
      const message = {
        ready: "Both eyes found.",
        noFace: "Keep one face in view.",
        lowConfidence: "Move into clearer light and keep both eyes open.",
      }[state];
      setStatus(detail ?? message ?? state);
    }
    if (["permissionDenied", "unavailable", "error"].includes(state)) {
      setRunState("error");
      void stopGaze();
    }
  }, []);

  const start = useCallback(async () => {
    setRunState("starting");
    setStatus("Starting camera…");
    setFrame(null);
    clearCalibration();
    try {
      await startGaze(onEvent);
      setRunState("running");
    } catch (error) {
      setRunState("error");
      setStatus(error instanceof Error ? error.message : String(error));
      void stopGaze();
    }
  }, [clearCalibration, onEvent]);

  const beginCalibration = useCallback(() => {
    if (runState !== "running" || !frame?.point || calibrationIndex !== null) return;
    calibrationSession.current = startBoxCalibration(performance.now());
    setCalibration(null);
    setCalibrationIndex(0);
    setStatus("Look at the first dot and hold your gaze steady.");
  }, [calibrationIndex, frame?.point, runState]);

  useEffect(() => () => {
    void stopGaze();
  }, []);

  const running = runState === "starting" || runState === "running";
  const canCalibrate = runState === "running" && !!frame?.point && calibrationIndex === null;
  const calibrationMessage = calibrationIndex !== null
    ? `Calibrating corner ${calibrationIndex + 1} of ${calibrationPoints.length}.`
    : calibration
      ? "The pointer is calibrated to this box."
      : running
        ? "Calibrate before testing the pointer."
        : "Start the camera, then calibrate.";

  return (
    <Screen
      title="Eye tracker"
      description="A camera-box test bed. The virtual pointer cannot leave this box or press anything."
      action={(
        <Button
          aria-pressed={running}
          className="min-h-11"
          onClick={() => void (running ? stop() : start())}
          size="lg"
          type="button"
          variant={running ? "outline" : "default"}
        >
          {running ? <CircleStop aria-hidden="true" /> : <Play aria-hidden="true" />}
          {running ? "Stop camera" : "Start camera"}
        </Button>
      )}
    >
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle>Camera feed</CardTitle>
              <CardDescription>The feed follows your face. Calibrate, then move your eyes.</CardDescription>
            </div>
            <Badge variant={runState === "error" ? "destructive" : running ? "default" : "secondary"}>
              {runState === "off" ? "Off" : runState === "starting" ? "Starting" : runState === "running" ? "Running" : "Error"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CameraBox
            calibration={calibration}
            calibrationIndex={calibrationIndex}
            frame={frame}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              aria-disabled={!canCalibrate}
              className="min-h-11"
              onClick={beginCalibration}
              size="lg"
              type="button"
              variant="outline"
            >
              <Crosshair aria-hidden="true" />
              {calibrationIndex !== null ? "Calibrating…" : calibration ? "Recalibrate" : "Calibrate"}
            </Button>
            <p className="text-foreground text-sm font-medium">{calibrationMessage}</p>
          </div>
          <p className="text-muted-foreground text-sm" role="status">
            {status}
          </p>
          <p className="text-muted-foreground text-sm">
            The feed stays in memory and stops when you leave this page.
          </p>
        </CardContent>
      </Card>
    </Screen>
  );
}
