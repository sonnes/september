import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { XCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";

type BannerType = "success" | "error" | "warning";

interface BannerProps {
  type: BannerType;
  title: string;
  message: string;
  onDismiss?: () => void;
}

const bannerStyles = {
  success: {
    bg: "bg-green-50",
    border: "border-green-400",
    text: "text-green-800",
    textBody: "text-green-700",
    icon: CheckCircleIcon,
    iconColor: "text-green-400",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-800",
    textBody: "text-red-700",
    icon: XCircleIcon,
    iconColor: "text-red-400",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    text: "text-yellow-800",
    textBody: "text-yellow-700",
    icon: ExclamationTriangleIcon,
    iconColor: "text-yellow-400",
  },
};

export function Banner({ type, title, message, onDismiss }: BannerProps) {
  const style = bannerStyles[type];

  return (
    <div className={`border-l-4 ${style.border} ${style.bg} p-4`}>
      <div className="flex justify-between">
        <div className="flex">
          <div className="shrink-0">
            <style.icon
              className={`size-5 ${style.iconColor}`}
              aria-hidden="true"
            />
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${style.text}`}>{title}</h3>
            <div className={`mt-2 text-sm ${style.textBody}`}>
              <p>{message}</p>
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            className={`shrink-0 ${style.textBody} hover:${style.text}`}
            onClick={onDismiss}
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
