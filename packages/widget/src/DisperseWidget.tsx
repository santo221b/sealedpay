/**
 * <DisperseWidget /> — the single import.
 *
 * Self-contained: wallet stack, FHE encryption, contract calls, status UI and
 * theming all live inside. A partner renders the component, optionally passes
 * a theme and a token, and has confidential bulk payouts.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { AccountChip, ConnectGate } from "./components/ConnectGate";
import { DeliveredPanel } from "./components/DeliveredPanel";
import { PrivacyBadge } from "./components/PrivacyBadge";
import { RecipientsEditor } from "./components/RecipientsEditor";
import { ReviewPanel } from "./components/ReviewPanel";
import { StatusTimeline } from "./components/StatusTimeline";
import { Button } from "./components/ui";
import { useDisperseFlow, type DeliveryResult } from "./hooks/useDisperseFlow";
import { useTokenMeta } from "./hooks/useTokenMeta";
import { DEMO_TOKEN_ADDRESS, DISPERSE_ADDRESS_OVERRIDE, DISPERSE_SINGLETON, SEPOLIA_CHAIN_ID } from "./lib/contracts/addresses";
import { DisperseProviders } from "./providers";
import { themeToCssVars, type DisperseTheme } from "./theme";

export interface DisperseWidgetProps {
  /** ERC-7984 confidential token to disperse. Defaults to the demo token. */
  token?: `0x${string}`;
  /** Only Sepolia (11155111) for now. */
  chainId?: number;
  /** White-label theme — see DisperseTheme. */
  theme?: DisperseTheme;
  /** Card title, e.g. your product's feature name. */
  title?: string;
  /** Pre-fill the recipient list programmatically (`amount` in human units). */
  recipients?: { address: string; amount: string }[];
  /** Fires once delivery is confirmed from the on-chain event. */
  onDispersed?: (result: DeliveryResult) => void;
  /** Fires on real failures (not on user-cancelled wallet prompts). */
  onError?: (error: Error) => void;
  /** Enables WalletConnect in the connect modal. */
  walletConnectProjectId?: string;
}

const EXPLORER: Record<number, string> = { [SEPOLIA_CHAIN_ID]: "https://sepolia.etherscan.io" };

export function DisperseWidget(props: DisperseWidgetProps) {
  return (
    <DisperseProviders theme={props.theme} walletConnectProjectId={props.walletConnectProjectId}>
      <WidgetBody {...props} />
    </DisperseProviders>
  );
}

function WidgetBody(props: DisperseWidgetProps) {
  const chainId = props.chainId ?? SEPOLIA_CHAIN_ID;
  const token = props.token ?? DEMO_TOKEN_ADDRESS;
  // wagmi leaves `chain` undefined when the wallet sits on an unsupported network.
  const { isConnected, chain } = useAccount();
  const onSupportedChain = chain?.id === chainId;
  const { symbol, decimals } = useTokenMeta(token);
  const flow = useDisperseFlow({ token, chainId, onDispersed: props.onDispersed, onError: props.onError });
  // The recipient draft lives HERE, not in the editor — "Back" from review
  // must never eat a hand-typed list.
  const [draft, setDraft] = useState(
    () => props.recipients?.map((r) => `${r.address}, ${r.amount}`).join("\n") ?? "",
  );

  const cssVars = useMemo(() => themeToCssVars(props.theme), [props.theme]);
  const chainSupported = Boolean(DISPERSE_ADDRESS_OVERRIDE) || chainId in DISPERSE_SINGLETON;
  const explorerBase = EXPLORER[chainId] ?? "https://sepolia.etherscan.io";

  const ready = isConnected && onSupportedChain;
  const inFlight = ["encrypting", "authorizing", "dispersing", "confirming"].includes(flow.phase);

  return (
    <div
      style={{ ...cssVars, fontFamily: "var(--dk-font)" }}
      className="w-full max-w-md rounded-[var(--dk-radius)] border border-[var(--dk-border)] bg-[var(--dk-bg)] p-5 text-[var(--dk-text)] shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold leading-tight">{props.title ?? "Confidential payout"}</h2>
          <p className="text-[11px] text-[var(--dk-muted)]">
            {symbol ?? "…"} · amounts encrypted end-to-end
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <AccountChip />
          <PrivacyBadge />
        </div>
      </div>

      {!chainSupported && (
        <p className="rounded-[calc(var(--dk-radius)*0.6)] bg-[var(--dk-surface)] p-3 text-xs text-[var(--dk-muted)]">
          No disperse deployment is known for chain {chainId}. DisperseKit currently supports Sepolia (11155111).
        </p>
      )}

      {chainSupported && !token && (
        <p className="rounded-[calc(var(--dk-radius)*0.6)] bg-[var(--dk-surface)] p-3 text-xs text-[var(--dk-muted)]">
          No token configured. Pass <code className="font-mono">token=</code> or set{" "}
          <code className="font-mono">VITE_CTOKEN_ADDRESS</code>.
        </p>
      )}

      {chainSupported && token && !ready && <ConnectGate />}

      {chainSupported && token && ready && decimals === undefined && (
        // Amounts must never be parsed at a guessed scale — wait for the
        // token's real decimals before showing the editor.
        <div className="flex animate-pulse flex-col gap-2 py-4">
          <div className="h-24 rounded-[calc(var(--dk-radius)*0.7)] bg-[var(--dk-surface)]" />
          <div className="h-9 rounded-[calc(var(--dk-radius)*0.6)] bg-[var(--dk-surface)]" />
        </div>
      )}

      {chainSupported && token && ready && decimals !== undefined && (
        <>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={inFlight ? "flight" : flow.phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {flow.phase === "input" && (
                <RecipientsEditor
                  decimals={decimals}
                  symbol={symbol ?? "tokens"}
                  text={draft}
                  onTextChange={setDraft}
                  onReview={(parsed) => void flow.goToReview(parsed.rows)}
                />
              )}
              {flow.phase === "review" && (
                <ReviewPanel
                  rows={flow.rows}
                  total={flow.total}
                  decimals={decimals}
                  symbol={symbol ?? "tokens"}
                  gasFeePerRecipient={flow.gasFeePerRecipient}
                  maxRecipients={flow.maxRecipients}
                  operatorAlreadySet={flow.operatorAlreadySet}
                  onBack={flow.backToInput}
                  onExecute={() => void flow.execute()}
                />
              )}
              {inFlight && <StatusTimeline phase={flow.phase} />}
              {flow.phase === "delivered" && flow.delivery && (
                <DeliveredPanel
                  delivery={flow.delivery}
                  verification={flow.verification}
                  verifying={flow.verifying}
                  decimals={decimals}
                  symbol={symbol ?? "tokens"}
                  explorerBase={explorerBase}
                  onVerify={() => void flow.verifyDelivery()}
                  onReset={() => {
                    setDraft("");
                    flow.reset();
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {flow.error && (
            <p role="alert" className="mt-3 rounded-[calc(var(--dk-radius)*0.6)] bg-red-50 p-2.5 text-xs text-red-600">
              {flow.error}
            </p>
          )}

          {flow.phase === "confirming" && flow.error && flow.pendingTxHash && (
            // The tx is on-chain; never send the user back to review from here.
            <div className="mt-2 flex items-center gap-2">
              <Button className="flex-1" onClick={() => void flow.retryConfirmation()}>
                Retry confirmation
              </Button>
              <a
                className="text-xs font-medium text-[var(--dk-accent)] hover:underline"
                href={`${explorerBase}/tx/${flow.pendingTxHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on explorer ↗
              </a>
            </div>
          )}
        </>
      )}

      <p className="mt-4 text-center text-[10px] text-[var(--dk-muted)]/70">
        Powered by DisperseKit · TokenOps disperse · Zama FHE
      </p>
    </div>
  );
}
