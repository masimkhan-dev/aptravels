import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Loader2, Eye, EyeOff, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a session (Supabase automatically handles the hash/recovery token)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Invalid or expired reset link.");
        navigate("/admin/login");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          navigate("/admin/login");
        }, 3000);
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-24 h-24 rounded-full bg-transparent shadow-xl flex items-center justify-center mx-auto mb-6 border-[3px] border-gold/50 hover:scale-105 transition-transform overflow-hidden relative">
              <img src="/logo-main.png" alt="Akbar Pura Travel Logo" className="w-[110%] h-[110%] object-cover mix-blend-multiply contrast-125 scale-110" />
            </div>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight underline decoration-gold/30">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-1"> Enter your new secure password </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-3xl p-8 border border-border shadow-2xl shadow-black/5 space-y-6 relative overflow-hidden"
        >
          {/* Subtle top shine */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">New Password</label>
            <div className="relative group">
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-background rounded-xl border border-input focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-medium transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Confirm New Password</label>
            <div className="relative group">
              <input
                type={showPass ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-background rounded-xl border border-input focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-medium transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-emerald-500 text-sm font-bold leading-tight">Identity Verified</p>
                <p className="text-emerald-500/80 text-xs font-medium leading-tight">Your password has been changed. Redirecting to login...</p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-destructive/10 p-3 rounded-lg border border-destructive/20"
            >
              <Lock className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-destructive text-sm font-medium leading-tight">{error}</p>
            </motion.div>
          )}

          {!success && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gold hover:bg-gold/90 text-secondary font-semibold shadow-md shadow-gold/20 hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3 group mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Update Password
                  <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/admin/login")}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Password changes are logged for security auditing.<br />IP Address: {window.location.hostname}
        </p>
      </motion.div>
    </div>
  );
}
