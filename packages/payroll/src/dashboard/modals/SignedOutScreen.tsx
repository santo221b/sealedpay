/**
 * Signed-out screen (modals.md §11) — full-screen after logout confirm,
 * personalized with the REAL profile name.
 */
import { motion, useReducedMotion } from "framer-motion";

import { SealLogo } from "../../design/SealLogo";
import type { SignedOutScreenProps } from "../contracts";

export function SignedOutScreen({ name, onSignIn }: SignedOutScreenProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center text-center"
      style={{
        background:
          "radial-gradient(810px 540px at 70% 20%, rgba(52,148,106,0.40), rgba(0,0,0,0) 62%), linear-gradient(135deg, #0b1210 0%, #0d1714 50%, #0a100e 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="flex flex-col items-center"
      >
        <SealLogo size={50} />
        <h1 style={{ fontSize: 25, fontWeight: 700, color: "#f2f7f4", marginTop: 18 }}>You’ve been logged out</h1>
        <p style={{ fontSize: 12.6, color: "#9db3aa", marginTop: 7 }}>See you soon, {name}.</p>
        <motion.button
          type="button"
          onClick={onSignIn}
          whileHover={reduced ? undefined : { scale: 1.04 }}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          className="cursor-pointer rounded-full"
          style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 12.6, fontWeight: 700, padding: "12px 30px", marginTop: 23 }}
        >
          Sign back in
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
