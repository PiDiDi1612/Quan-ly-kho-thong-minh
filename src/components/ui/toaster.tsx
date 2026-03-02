import { useToast } from "@/hooks/useToast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/Toast"
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, type, message }) {
        return (
          <Toast
            key={id}
            variant={type === 'error' ? 'destructive' : 'default'}
            className={cn(
              "mt-2 shadow-2xl border-2",
              type === 'success' && "border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100",
              type === 'warning' && "border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100",
              type === 'info' && "border-sky-500/50 bg-sky-50/90 dark:bg-sky-950/90 text-sky-900 dark:text-sky-100"
            )}
          >
            <div className="flex items-center gap-3 w-full">
              {type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
              {type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
              {type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
              {type === 'info' && <Info className="h-5 w-5 text-sky-500 shrink-0" />}
              <ToastDescription className="font-bold text-xs uppercase tracking-tight line-clamp-2">
                {message}
              </ToastDescription>
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
