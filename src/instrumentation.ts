import type { Instrumentation } from 'next'
import { reportError } from '@/lib/report-error'

/**
 * Next calls this for every uncaught server-side error - pages, layouts, route
 * handlers, server actions. Alerts the owner over the Telegram bot that already
 * carries order notifications, so there is no new service to run.
 *
 * ponytail: no Sentry until stack traces with source maps are worth paying for.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  await reportError(error, {
    path: request.path,
    method: request.method,
    digest:
      typeof error === 'object' && error !== null && 'digest' in error
        ? String((error as { digest?: unknown }).digest)
        : undefined,
  })
  console.error(`[${context.routeType}] ${request.method} ${request.path}`, error)
}
