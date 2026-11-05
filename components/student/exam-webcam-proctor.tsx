'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExamWebcamProctorProps {
  attemptId: string;
  examId: string;
  enabled?: boolean;
  onCameraViolation?: (violationType: 'camera_blocked' | 'camera_inactive', message: string) => void;
}

export function ExamWebcamProctor({
  attemptId,
  examId,
  enabled = true,
  onCameraViolation,
}: ExamWebcamProctorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [proctorStatus, setProctorStatus] = useState<'normal' | 'blocked' | 'inactive' | 'loading'>('loading');
  const [statusMessage, setStatusMessage] = useState('Đang khởi tạo camera...');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  // 1. Khởi động Webcam
  const startCamera = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      setProctorStatus('loading');
      setStatusMessage('Đang kết nối camera...');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setHasPermission(true);
      setProctorStatus('normal');
      setStatusMessage('Đang giám sát AI (Hợp lệ)');
      setLastCheckTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      console.warn('Webcam permission denied or error:', err);
      setHasPermission(false);
      setProctorStatus('inactive');
      setStatusMessage('Không thể mở camera. Vui lòng cấp quyền.');
      onCameraViolation?.('camera_inactive', 'Thí sinh từ chối hoặc không có webcam khả dụng.');
    }
  }, [enabled, onCameraViolation]);

  useEffect(() => {
    if (enabled) {
      void startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled, startCamera]);

  // 2. Định kỳ quét độ sáng khung hình bằng Canvas ẩn để phát hiện camera bị che khuất
  const inspectCameraFrame = useCallback(() => {
    if (!videoRef.current || !streamRef.current || proctorStatus === 'loading') return;

    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.ended) {
      setProctorStatus('inactive');
      setStatusMessage('Mất tín hiệu camera');
      onCameraViolation?.('camera_inactive', 'Video bị dừng hoặc mất tín hiệu.');
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 24;
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      ctx.drawImage(video, 0, 0, 32, 24);
      const imgData = ctx.getImageData(0, 0, 32, 24).data;

      let totalBrightness = 0;
      const pixelCount = 32 * 24;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i] || 0;
        const g = imgData[i + 1] || 0;
        const b = imgData[i + 2] || 0;
        // Chuẩn độ sáng mắt người (Luma Y): 0.299R + 0.587G + 0.114B
        totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
      }

      const avgBrightness = totalBrightness / pixelCount;
      setLastCheckTime(new Date().toLocaleTimeString('vi-VN'));

      // Nếu độ sáng trung bình < 15/255 thì coi là camera bị che tối đen
      if (avgBrightness < 15) {
        setProctorStatus('blocked');
        setStatusMessage('Cảnh báo: Camera bị che khuất!');
        onCameraViolation?.('camera_blocked', `Camera bị che hoặc phòng quá tối (Độ sáng: ${Math.round(avgBrightness)})`);
      } else {
        if (proctorStatus === 'blocked') {
          setProctorStatus('normal');
          setStatusMessage('Đang giám sát AI (Hợp lệ)');
        }
      }
    } catch (inspectionErr) {
      console.warn('Lỗi phân tích khung hình video:', inspectionErr);
    }
  }, [onCameraViolation, proctorStatus]);

  // Chạy kiểm tra định kỳ mỗi 60 giây
  useEffect(() => {
    if (!enabled || hasPermission !== true) return;

    // Kiểm tra lần đầu sau 5 giây để camera kịp ổn định ánh sáng
    const initialTimer = setTimeout(inspectCameraFrame, 5000);
    const interval = setInterval(inspectCameraFrame, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [enabled, hasPermission, inspectCameraFrame]);

  if (!enabled) return null;

  return (
    <div
      aria-label="Khung hình giám sát thi AI"
      className="fixed bottom-4 right-4 z-40 transition-all duration-300 select-none"
    >
      {isMinimized ? (
        // Khung PiP dạng thu nhỏ (Pill)
        <div className="flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-white/95 dark:bg-[#111C2D]/95 px-3 py-1.5 shadow-xl backdrop-blur-md">
          <span className="relative flex size-2.5">
            <span
              className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${
                proctorStatus === 'normal'
                  ? 'bg-emerald-400'
                  : proctorStatus === 'blocked'
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex size-2.5 rounded-full ${
                proctorStatus === 'normal'
                  ? 'bg-emerald-500'
                  : proctorStatus === 'blocked'
                    ? 'bg-rose-600'
                    : 'bg-amber-500'
              }`}
            />
          </span>

          <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            Giám sát AI
          </span>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            aria-label="Mở rộng khung camera"
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
          >
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      ) : (
        // Khung PiP đầy đủ (Picture-in-Picture)
        <div className="w-56 sm:w-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-2xl ring-1 ring-black/5 dark:ring-white/5 transition-all">
          {/* Header thanh PiP */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#0B1628]/95 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span
                  className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${
                    proctorStatus === 'normal'
                      ? 'bg-emerald-400'
                      : proctorStatus === 'blocked'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    proctorStatus === 'normal'
                      ? 'bg-emerald-500'
                      : proctorStatus === 'blocked'
                        ? 'bg-rose-600'
                        : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Camera Giám Thị AI
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Thu nhỏ để không che đề"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 transition"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Vùng Video Feed */}
          <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`size-full object-cover -scale-x-100 transition-opacity duration-300 ${
                hasPermission === true ? 'opacity-100' : 'opacity-20'
              }`}
            />

            {/* Trạng thái lỗi hoặc đang tải */}
            {hasPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950/90 text-white">
                <CameraOff className="size-7 text-rose-400 mb-1.5" />
                <p className="text-[11px] font-semibold text-rose-300">Không có quyền Camera</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-medium hover:bg-white/20 transition"
                >
                  <RefreshCw className="size-3" /> Thử lại
                </button>
              </div>
            )}

            {/* Cảnh báo camera bị che */}
            {proctorStatus === 'blocked' && (
              <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 p-1.5 text-center text-white backdrop-blur-xs animate-pulse">
                <p className="text-[10px] font-bold flex items-center justify-center gap-1">
                  <AlertTriangle className="size-3 shrink-0" /> Camera bị che hoặc tối đen!
                </p>
              </div>
            )}
          </div>

          {/* Footer trạng thái */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111C2D] px-3 py-1.5 text-[10px]">
            <span
              className={`font-semibold truncate max-w-[150px] ${
                proctorStatus === 'normal'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : proctorStatus === 'blocked'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {statusMessage}
            </span>

            {lastCheckTime && (
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px]">
                {lastCheckTime}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

