use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread::JoinHandle,
};

use serde::Serialize;
use tauri::{ipc::Channel, State};

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub(crate) struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct NormalizedRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl NormalizedRect {
    const FULL: Self = Self {
        x: 0.0,
        y: 0.0,
        width: 1.0,
        height: 1.0,
    };
}

fn face_crop(face: NormalizedRect) -> NormalizedRect {
    // The source and preview are both 16:9, so a square in normalized source
    // coordinates preserves the preview aspect ratio.
    let size = (face.width * 2.2).max(face.height * 1.6).clamp(0.35, 1.0);
    let center_x = face.x + face.width / 2.0;
    let center_y = face.y + face.height / 2.0;
    NormalizedRect {
        x: (center_x - size / 2.0).clamp(0.0, 1.0 - size),
        y: (center_y - size / 2.0).clamp(0.0, 1.0 - size),
        width: size,
        height: size,
    }
}

struct GazeRun {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<()>,
}

#[derive(Default)]
pub(crate) struct GazeState {
    run: Mutex<Option<GazeRun>>,
}

#[derive(Default)]
struct Smoother {
    previous: Option<Point>,
}

#[derive(Default)]
struct CropSmoother {
    previous: Option<NormalizedRect>,
}

impl CropSmoother {
    fn update(&mut self, crop: NormalizedRect) -> NormalizedRect {
        let crop = self.previous.map_or(crop, |previous| NormalizedRect {
            x: previous.x + (crop.x - previous.x) * 0.15,
            y: previous.y + (crop.y - previous.y) * 0.15,
            width: previous.width + (crop.width - previous.width) * 0.15,
            height: previous.height + (crop.height - previous.height) * 0.15,
        });
        self.previous = Some(crop);
        crop
    }

    fn current(&self) -> Option<NormalizedRect> {
        self.previous
    }
}

impl Smoother {
    fn update(&mut self, point: Point) -> Point {
        // ponytail: this constant is the one tuning knob for the hardware
        // trial. A higher value follows faster; a lower value shakes less.
        let smoothed = self.previous.map_or(point, |previous| Point {
            x: previous.x + (point.x - previous.x) * 0.35,
            y: previous.y + (point.y - previous.y) * 0.35,
        });
        self.previous = Some(smoothed);
        smoothed
    }
}

fn eye_position(pupil: Point, eye: &[Point]) -> Option<Point> {
    let (first, rest) = eye.split_first()?;
    let (mut min_x, mut max_x, mut min_y, mut max_y) = (first.x, first.x, first.y, first.y);
    for point in rest {
        min_x = min_x.min(point.x);
        max_x = max_x.max(point.x);
        min_y = min_y.min(point.y);
        max_y = max_y.max(point.y);
    }
    let width = max_x - min_x;
    let height = max_y - min_y;
    if width <= f64::EPSILON || height / width < 0.08 {
        return None;
    }

    Some(Point {
        x: ((pupil.x - min_x) / width).clamp(0.0, 1.0),
        y: ((pupil.y - min_y) / height).clamp(0.0, 1.0),
    })
}

fn downsample_bgra_crop(
    pixels: &[u8],
    source_width: usize,
    source_height: usize,
    source_bytes_per_row: usize,
    crop: NormalizedRect,
    target_width: usize,
    target_height: usize,
) -> Option<Vec<u8>> {
    if source_width == 0
        || source_height == 0
        || target_width == 0
        || target_height == 0
        || crop.x < 0.0
        || crop.y < 0.0
        || crop.width <= 0.0
        || crop.height <= 0.0
        || crop.x + crop.width > 1.0
        || crop.y + crop.height > 1.0
        || source_bytes_per_row < source_width.checked_mul(4)?
        || pixels.len() < source_bytes_per_row.checked_mul(source_height)?
    {
        return None;
    }

    let crop_x = (crop.x * source_width as f64).floor() as usize;
    let crop_y = (crop.y * source_height as f64).floor() as usize;
    let crop_width = ((crop.width * source_width as f64).round() as usize)
        .max(1)
        .min(source_width - crop_x);
    let crop_height = ((crop.height * source_height as f64).round() as usize)
        .max(1)
        .min(source_height - crop_y);
    let mut rgba = Vec::with_capacity(target_width.checked_mul(target_height)?.checked_mul(4)?);
    for y in 0..target_height {
        let source_y = crop_y + y * crop_height / target_height;
        for x in 0..target_width {
            let source_x = crop_x + x * crop_width / target_width;
            let offset = source_y * source_bytes_per_row + source_x * 4;
            rgba.extend_from_slice(&[pixels[offset + 2], pixels[offset + 1], pixels[offset], 255]);
        }
    }
    Some(rgba)
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub(crate) enum GazeEvent {
    Frame {
        width: usize,
        height: usize,
        #[serde(rename = "pixelsBase64")]
        pixels_base64: String,
        point: Option<Point>,
    },
    Status {
        state: &'static str,
        detail: Option<String>,
    },
}

impl GazeState {
    pub(crate) fn stop(&self) -> Result<(), String> {
        let run = self
            .run
            .lock()
            .map_err(|_| "the eye-tracker state is unavailable".to_string())?
            .take();
        if let Some(run) = run {
            run.stop.store(true, Ordering::Release);
            run.handle
                .join()
                .map_err(|_| "the eye-tracker camera stopped unexpectedly".to_string())?;
        }
        Ok(())
    }
}

#[tauri::command(async)]
pub(crate) fn gaze_start(
    state: State<'_, GazeState>,
    on_event: Channel<GazeEvent>,
) -> Result<(), String> {
    let mut run = state
        .run
        .lock()
        .map_err(|_| "the eye-tracker state is unavailable".to_string())?;
    if run.is_some() {
        return Err("the eye tracker is already running".to_string());
    }

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = stop.clone();
    let handle = std::thread::Builder::new()
        .name("september-eye-tracker".to_string())
        .spawn(move || capture_loop(on_event, thread_stop))
        .map_err(|error| format!("the eye tracker could not start: {error}"))?;
    *run = Some(GazeRun { stop, handle });
    Ok(())
}

#[tauri::command(async)]
pub(crate) fn gaze_stop(state: State<'_, GazeState>) -> Result<(), String> {
    state.stop()
}

#[cfg(not(target_os = "macos"))]
fn capture_loop(channel: Channel<GazeEvent>, _stop: Arc<AtomicBool>) {
    let _ = channel.send(GazeEvent::Status {
        state: "unavailable",
        detail: Some("eye tracking is available only on macOS".to_string()),
    });
}

#[cfg(target_os = "macos")]
fn capture_loop(channel: Channel<GazeEvent>, stop: Arc<AtomicBool>) {
    native::capture_loop(channel, stop);
}

#[cfg(target_os = "macos")]
#[allow(clippy::useless_transmute)]
mod native {
    use std::{sync::mpsc, thread, time::Duration};

    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use cidre::av::CaptureVideoDataOutputSampleBufDelegate;
    use cidre::{arc, av, blocks, cm, cv, define_obj_type, dispatch, ns, objc, vn};

    use super::{
        downsample_bgra_crop, eye_position, face_crop, CropSmoother, GazeEvent, NormalizedRect,
        Point, Smoother,
    };
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };
    use std::time::Instant;
    use tauri::ipc::Channel;

    const ANALYSIS_INTERVAL: Duration = Duration::from_millis(66);
    const PREVIEW_INTERVAL: Duration = Duration::from_millis(200);
    const PREVIEW_WIDTH: usize = 320;
    const MIN_CONFIDENCE: f32 = 0.5;

    define_obj_type!(DetectFaceLandmarksRequest(vn::ImageBasedRequest));

    impl DetectFaceLandmarksRequest {
        fn cls() -> &'static objc::Class<Self> {
            let class =
                unsafe { objc::objc_getClass(c"VNDetectFaceLandmarksRequest".as_ptr().cast()) }
                    .expect("VNDetectFaceLandmarksRequest is available on macOS");
            unsafe { &*(class as *const _ as *const objc::Class<Self>) }
        }

        fn new() -> arc::R<Self> {
            unsafe { Self::cls().new() }
        }

        #[objc::msg_send(results)]
        fn results(&self) -> Option<arc::R<ns::Array<vn::FaceObservation>>>;
    }

    struct FrameProcessor {
        channel: Channel<GazeEvent>,
        last_analysis: Option<Instant>,
        last_preview: Option<Instant>,
        last_status: Option<&'static str>,
        smoother: Smoother,
        crop_smoother: CropSmoother,
    }

    #[derive(Clone, Copy)]
    struct FrameAnalysis {
        point: Point,
        confidence: f32,
        face: NormalizedRect,
    }

    define_obj_type!(
        FrameDelegate + av::CaptureVideoDataOutputSampleBufDelegateImpl,
        FrameProcessor,
        SEPTEMBER_GAZE_FRAME_DELEGATE
    );

    impl av::CaptureVideoDataOutputSampleBufDelegate for FrameDelegate {}

    #[objc::add_methods]
    impl av::CaptureVideoDataOutputSampleBufDelegateImpl for FrameDelegate {
        extern "C" fn impl_capture_output_did_output_sample_buf_from_connection(
            &mut self,
            _cmd: Option<&objc::Sel>,
            _output: &av::CaptureOutput,
            sample_buf: &cm::SampleBuf,
            _connection: &av::CaptureConnection,
        ) {
            self.inner_mut().process(sample_buf);
        }
    }

    impl FrameProcessor {
        fn process(&mut self, sample_buf: &cm::SampleBuf) {
            let now = Instant::now();
            if self
                .last_analysis
                .is_some_and(|last| now.duration_since(last) < ANALYSIS_INTERVAL)
            {
                return;
            }
            self.last_analysis = Some(now);
            let _pool = objc::AutoreleasePoolPage::push();

            let analysis = analyze_frame(sample_buf);
            let point = match analysis {
                Some(analysis) if analysis.confidence >= MIN_CONFIDENCE => {
                    self.status("ready", None);
                    Some(self.smoother.update(analysis.point))
                }
                Some(_) => {
                    self.status("lowConfidence", None);
                    None
                }
                None => {
                    self.status("noFace", None);
                    None
                }
            };
            let crop = analysis
                .map(|analysis| self.crop_smoother.update(face_crop(analysis.face)))
                .or_else(|| self.crop_smoother.current())
                .unwrap_or(NormalizedRect::FULL);
            self.send_frame(sample_buf, point, crop, now);
        }

        fn send_frame(
            &mut self,
            sample_buf: &cm::SampleBuf,
            point: Option<Point>,
            crop: NormalizedRect,
            now: Instant,
        ) {
            if self
                .last_preview
                .is_some_and(|last| now.duration_since(last) < PREVIEW_INTERVAL)
            {
                return;
            }
            let Some((width, height, pixels_base64)) = preview_frame(sample_buf, crop) else {
                return;
            };

            self.last_preview = Some(now);
            let _ = self.channel.send(GazeEvent::Frame {
                width,
                height,
                pixels_base64,
                point,
            });
        }

        fn status(&mut self, state: &'static str, detail: Option<String>) {
            if self.last_status == Some(state) && detail.is_none() {
                return;
            }
            self.last_status = Some(state);
            let _ = self.channel.send(GazeEvent::Status { state, detail });
        }
    }

    fn analyze_frame(sample_buf: &cm::SampleBuf) -> Option<FrameAnalysis> {
        let pixel_buf = sample_buf.image_buf()?;
        let request = DetectFaceLandmarksRequest::new();
        let request_ref: &vn::Request = &request;
        let requests = ns::Array::from_slice(&[request_ref]);
        let handler = vn::ImageRequestHandler::with_cv_pixel_buf(pixel_buf, None)?;
        handler.perform(&requests).ok()?;
        let faces = request.results()?;
        if faces.len() != 1 {
            return None;
        }
        let face = faces.first()?;
        let landmarks = face.landmarks()?;
        let left_pupil = landmarks.left_pupil()?;
        let left_eye = landmarks.left_eye()?;
        let right_pupil = landmarks.right_pupil()?;
        let right_eye = landmarks.right_eye()?;
        let left = pupil_in_eye(&left_pupil, &left_eye)?;
        let right = pupil_in_eye(&right_pupil, &right_eye)?;
        let face_box = face.bounding_box();

        Some(FrameAnalysis {
            point: Point {
                x: (left.x + right.x) / 2.0,
                y: (left.y + right.y) / 2.0,
            },
            confidence: face.confidence().min(landmarks.confidence()),
            face: NormalizedRect {
                x: face_box.origin.x,
                y: 1.0 - face_box.origin.y - face_box.size.height,
                width: face_box.size.width,
                height: face_box.size.height,
            },
        })
    }

    fn pupil_in_eye(
        pupil: &vn::FaceLandmarkRegion2d,
        eye: &vn::FaceLandmarkRegion2d,
    ) -> Option<Point> {
        let pupil = pupil.normalized_points().first()?;
        let pupil = Point {
            x: pupil.x,
            y: pupil.y,
        };
        let eye = eye
            .normalized_points()
            .iter()
            .map(|point| Point {
                x: point.x,
                y: point.y,
            })
            .collect::<Vec<_>>();
        eye_position(pupil, &eye)
    }

    fn preview_frame(
        sample_buf: &cm::SampleBuf,
        crop: NormalizedRect,
    ) -> Option<(usize, usize, String)> {
        let image_buf = sample_buf.image_buf()?;
        if image_buf.pixel_format() != cv::PixelFormat::_32_BGRA {
            return None;
        }

        let mut image_buf = image_buf.retained();
        let source_width = image_buf.width();
        let source_height = image_buf.height();
        let source_bytes_per_row = image_buf.bytes_per_row();
        let data_size = image_buf.data_size();
        let target_width = PREVIEW_WIDTH.min(source_width);
        let target_height = (source_height * target_width / source_width).max(1);
        let flags = cv::pixel_buffer::LockFlags::READ_ONLY;
        if unsafe { image_buf.lock_base_addr(flags) }.is_err() {
            return None;
        }

        let address = unsafe { image_buf.base_address() };
        let rgba = if address.is_null() {
            None
        } else {
            let pixels = unsafe { std::slice::from_raw_parts(address.cast::<u8>(), data_size) };
            downsample_bgra_crop(
                pixels,
                source_width,
                source_height,
                source_bytes_per_row,
                crop,
                target_width,
                target_height,
            )
        };
        let _ = unsafe { image_buf.unlock_lock_base_addr(flags) };
        rgba.map(|rgba| (target_width, target_height, STANDARD.encode(rgba)))
    }

    fn camera_permission(stop: &AtomicBool) -> Result<bool, String> {
        match av::CaptureDevice::authorization_status_for_media_type(av::MediaType::video())
            .map_err(|error| format!("camera permission could not be read: {error:?}"))?
        {
            av::AuthorizationStatus::Authorized => Ok(true),
            av::AuthorizationStatus::Denied | av::AuthorizationStatus::Restricted => Ok(false),
            av::AuthorizationStatus::NotDetermined => {
                let (sender, receiver) = mpsc::channel();
                let mut callback = blocks::SendBlock::<fn(bool)>::new1(move |granted| {
                    let _ = sender.send(granted);
                });
                av::CaptureDevice::request_access_for_media_type_ch(
                    av::MediaType::video(),
                    &mut callback,
                )
                .map_err(|error| format!("camera permission could not be requested: {error:?}"))?;
                loop {
                    if stop.load(Ordering::Acquire) {
                        return Ok(false);
                    }
                    match receiver.recv_timeout(Duration::from_millis(100)) {
                        Ok(granted) => return Ok(granted),
                        Err(mpsc::RecvTimeoutError::Timeout) => {}
                        Err(mpsc::RecvTimeoutError::Disconnected) => {
                            return Err("the camera permission request did not answer".to_string());
                        }
                    }
                }
            }
        }
    }

    pub(super) fn capture_loop(channel: Channel<GazeEvent>, stop: Arc<AtomicBool>) {
        let _pool = objc::AutoreleasePoolPage::push();
        let _ = channel.send(GazeEvent::Status {
            state: "starting",
            detail: None,
        });
        match camera_permission(&stop) {
            Ok(true) => {}
            Ok(false) => {
                let _ = channel.send(GazeEvent::Status {
                    state: "permissionDenied",
                    detail: Some(
                        "Allow September to use the camera in System Settings, then try again."
                            .to_string(),
                    ),
                });
                return;
            }
            Err(detail) => {
                let _ = channel.send(GazeEvent::Status {
                    state: "error",
                    detail: Some(detail),
                });
                return;
            }
        }

        if let Err(detail) = run_camera(channel.clone(), &stop) {
            let _ = channel.send(GazeEvent::Status {
                state: "error",
                detail: Some(detail),
            });
            return;
        }
        let _ = channel.send(GazeEvent::Status {
            state: "stopped",
            detail: None,
        });
    }

    fn run_camera(channel: Channel<GazeEvent>, stop: &AtomicBool) -> Result<(), String> {
        let device = av::CaptureDevice::default_with_media(av::MediaType::video())
            .ok_or_else(|| "September could not find a camera".to_string())?;
        let input = av::CaptureDeviceInput::with_device(&device)
            .map_err(|error| format!("September could not open the camera: {error:?}"))?;
        let mut output = av::capture::VideoDataOutput::new();
        output.set_always_discard_late_video_frames(true);
        let video_settings = ns::Dictionary::with_keys_values(
            &[cv::pixel_buffer_keys::pixel_format().as_ns()],
            &[cv::PixelFormat::_32_BGRA.to_ns_number().as_id_ref()],
        );
        output
            .set_video_settings(Some(&video_settings))
            .map_err(|error| format!("the camera preview format is unavailable: {error:?}"))?;
        let frame_queue = dispatch::Queue::new();
        let delegate = FrameDelegate::with(FrameProcessor {
            channel,
            last_analysis: None,
            last_preview: None,
            last_status: None,
            smoother: Smoother::default(),
            crop_smoother: CropSmoother::default(),
        });
        output.set_sample_buf_delegate(Some(delegate.as_ref()), Some(&frame_queue));

        let mut session = av::capture::Session::new();
        if session.can_set_session_preset(av::CaptureSessionPreset::_1280x720()) {
            session
                .set_session_preset(av::CaptureSessionPreset::_1280x720())
                .map_err(|error| format!("the camera size could not be selected: {error:?}"))?;
        }
        session.configure(|session| {
            if session.can_add_input(&input) {
                session.add_input(&input);
            }
            if session.can_add_output(&output) {
                session.add_output(&output);
            }
        });
        if session.inputs().is_empty() || session.outputs().is_empty() {
            return Err("the camera does not support live eye tracking".to_string());
        }

        session.start_running();
        while !stop.load(Ordering::Acquire) {
            thread::sleep(Duration::from_millis(50));
        }
        session.stop_running();
        output.set_sample_buf_delegate::<FrameDelegate>(None, None);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 0.000_001,
            "{actual} != {expected}"
        );
    }

    #[test]
    fn pupil_position_is_relative_to_the_eye_outline() {
        let eye = [
            Point { x: 0.2, y: 0.4 },
            Point { x: 0.8, y: 0.4 },
            Point { x: 0.8, y: 0.6 },
            Point { x: 0.2, y: 0.6 },
        ];
        let point = eye_position(Point { x: 0.5, y: 0.45 }, &eye).unwrap();

        assert_close(point.x, 0.5);
        assert_close(point.y, 0.25);
    }

    #[test]
    fn a_closed_or_degenerate_eye_has_no_gaze_position() {
        let closed = [
            Point { x: 0.2, y: 0.5 },
            Point { x: 0.8, y: 0.5 },
            Point { x: 0.5, y: 0.51 },
        ];

        assert_eq!(eye_position(Point { x: 0.5, y: 0.5 }, &closed), None);
        assert_eq!(eye_position(Point { x: 0.5, y: 0.5 }, &[]), None);
    }

    #[test]
    fn smoothing_reduces_a_single_jump() {
        let mut smoother = Smoother::default();
        assert_eq!(
            smoother.update(Point { x: 0.2, y: 0.4 }),
            Point { x: 0.2, y: 0.4 }
        );
        let next = smoother.update(Point { x: 0.8, y: 1.0 });

        assert!(next.x > 0.2 && next.x < 0.8);
        assert!(next.y > 0.4 && next.y < 1.0);
    }

    #[test]
    fn a_bgra_preview_is_downsampled_and_changed_to_rgba() {
        let bgra = [
            10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
        ];

        let preview = downsample_bgra_crop(&bgra, 2, 2, 8, NormalizedRect::FULL, 1, 1).unwrap();

        assert_eq!(preview, vec![30, 20, 10, 255]);
    }

    #[test]
    fn the_preview_crop_is_padded_around_the_face_and_stays_in_frame() {
        let face = NormalizedRect {
            x: 0.4,
            y: 0.2,
            width: 0.2,
            height: 0.4,
        };
        let crop = face_crop(face);

        assert_close(crop.width, crop.height);
        assert!(crop.x <= face.x && crop.y <= face.y);
        assert!(crop.x + crop.width >= face.x + face.width);
        assert!(crop.y + crop.height >= face.y + face.height);
        assert!(crop.x >= 0.0 && crop.y >= 0.0);
        assert!(crop.x + crop.width <= 1.0);
        assert!(crop.y + crop.height <= 1.0);
    }

    #[test]
    fn a_preview_can_downsample_only_the_face_crop() {
        let bgra = [
            10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
        ];
        let bottom_right = NormalizedRect {
            x: 0.5,
            y: 0.5,
            width: 0.5,
            height: 0.5,
        };

        let preview = downsample_bgra_crop(&bgra, 2, 2, 8, bottom_right, 1, 1).unwrap();

        assert_eq!(preview, vec![120, 110, 100, 255]);
    }

    #[test]
    fn a_frame_uses_the_webview_field_names() {
        let json = serde_json::to_string(&GazeEvent::Frame {
            width: 320,
            height: 180,
            pixels_base64: "pixels".to_string(),
            point: Some(Point { x: 0.2, y: 0.4 }),
        })
        .unwrap();

        assert!(json.contains("\"event\":\"frame\""));
        assert!(json.contains("\"pixelsBase64\":\"pixels\""));
        assert!(!json.contains("pixels_base64"));
        assert!(!json.contains("landmark"));
    }
}
