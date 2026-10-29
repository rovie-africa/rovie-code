export * as DesktopInitialization from "./desktop-initialization"

import { app } from "electron"
import { Context, Effect, Layer } from "effect"
import { DesktopLogging } from "../native/logging"
import { marks } from "./marks"
import {
  preferApplicationEnvironment,
  prepareApplicationEnvironment,
  prepareDesktop,
} from "./environment"

export interface Interface {
  readonly version: string
}

export class Service extends Context.Service<Service, Interface>()("opencode/desktop/DesktopInitialization") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const logging = yield* DesktopLogging.Service
    yield* preferApplicationEnvironment
    // System certificates and the proxy serve early network work; the first window and
    // its IPC port do not wait for them.
    yield* Effect.forkScoped(prepareApplicationEnvironment)
    yield* Effect.promise(() => app.whenReady())
    yield* prepareDesktop
    yield* Effect.forkScoped(logging.startNetwork)
    marks.init = Date.now()

    return Service.of({
      version: app.getVersion(),
    })
  }),
)
