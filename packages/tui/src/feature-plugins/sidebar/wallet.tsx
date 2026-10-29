import { Plugin } from "@opencode/plugin/tui"
import { Rpc } from "@opencode/schema/rpc"
import { Schema } from "effect"
import { Show } from "solid-js"

const RovieWalletBalanceSchema = Schema.Struct({
  availableUsd: Schema.Number,
  spendUsd: Schema.Number,
  maxBudgetUsd: Schema.NullOr(Schema.Number),
  localCurrency: Schema.String,
  availableLocal: Schema.Number,
  spendLocal: Schema.Number,
  maxBudgetLocal: Schema.NullOr(Schema.Number),
  country: Schema.String,
})

export type RovieWalletBalance = typeof RovieWalletBalanceSchema.Type

const RovieWalletRpc = Rpc.define({
  id: "rovie.wallet",
  methods: {
    balance: {
      input: Schema.toStandardSchemaV1(Schema.Struct({})),
      output: Schema.toStandardSchemaV1(Schema.NullOr(RovieWalletBalanceSchema)),
    },
  },
  events: {
    updated: {
      schema: Schema.toStandardSchemaV1(RovieWalletBalanceSchema),
    },
  },
})

export function formatLocalCurrency(currency: string, amount: number): string {
  const zeroDecimal = currency === "UGX"
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  })
  return `${currency} ${formatted}`
}

export default Plugin.define({
  id: "opencode.sidebar.wallet",
  setup(context) {
    const [wallet, setWallet] = context.storage.memory<{ balance: RovieWalletBalance | null }>("rovie-wallet", {
      initial: { balance: null },
    })

    const rpc = context.client.rpc(RovieWalletRpc)
    const refresh = () => {
      void rpc
        .balance({}, { location: context.location })
        .then((balance) => {
          setWallet((draft) => {
            draft.balance = balance
          })
        })
        .catch(() => undefined)
    }

    refresh()
    const offSucceeded = context.data.on("session.execution.succeeded", () => refresh())
    const offIntegration = context.data.on("integration.updated", () => refresh())

    context.ui.slot({
      append: "sidebar.content",
      render: () => {
        const theme = context.theme
        return (
          <Show when={wallet.balance}>
            {(balance) => (
              <box>
                <text fg={theme.text.base}>
                  <b>Rovie Wallet</b>
                </text>
                <text
                  fg={
                    balance().availableUsd <= 0.5
                      ? theme.text.feedback.error.base
                      : theme.text.muted
                  }
                >
                  {formatLocalCurrency(balance().localCurrency, balance().availableLocal)} remaining
                </text>
              </box>
            )}
          </Show>
        )
      },
    })

    context.ui.slot({
      append: "home.footer.status",
      render: () => {
        const theme = context.theme
        return (
          <Show when={wallet.balance}>
            {(balance) => (
              <box gap={1} flexDirection="row" flexShrink={0}>
                <text fg={theme.text.base}>
                  <span
                    style={{
                      fg:
                        balance().availableUsd <= 0.5
                          ? theme.text.feedback.error.base
                          : theme.text.feedback.success.base,
                    }}
                  >
                    ⊙{" "}
                  </span>
                  {formatLocalCurrency(balance().localCurrency, balance().availableLocal)}
                </text>
              </box>
            )}
          </Show>
        )
      },
    })

    return () => {
      offSucceeded()
      offIntegration()
    }
  },
})

