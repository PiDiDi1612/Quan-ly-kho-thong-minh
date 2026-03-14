import { useToast as useShadcnToast } from "@/hooks/use-toast"
import { useToast as useZustandToast } from "@/hooks/useToast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts: shaderToasts } = useShadcnToast()
  const zustandToasts = useZustandToast(state => state.toasts);

  return (
    <ToastProvider>
      {/* Shadcn UI Toasts */}
      {shaderToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      
      {/* Zustand Toasts */}
      {zustandToasts.map((t) => (
        <Toast key={t.id} variant={t.type === 'error' ? 'destructive' : 'default'} className={t.type === 'success' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' : ''}>
          <div className="grid gap-1">
            <ToastTitle className="flex items-center gap-2">
              {t.type === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
              {t.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" />}
              {t.type.toUpperCase()}
            </ToastTitle>
            <ToastDescription>{t.message}</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
