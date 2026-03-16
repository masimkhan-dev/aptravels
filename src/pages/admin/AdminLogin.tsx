import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Loader2, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useRole();

  if (!roleLoading && role) {
    const target = (role === 'admin' || role === 'manager') ? "/admin/dashboard" : "/admin/bookings";
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Context-aware validation
    if (isResetMode && !email) {
      setError("Email address is required for password reset.");
      return;
    }
    if (!isResetMode && (!email || !password)) {
      setError("Credentials required.");
      return;
    }

    setLoading(true);
    setError("");

    if (isResetMode) {
      // 1. Safe Verify - Check if user is an actual staff member first using our RPC
      const { data: exists, error: checkError } = await supabase.rpc('check_staff_email_exists', { p_email: email });
      
      if (checkError || !exists) {
        setError("Account not found. Please contact your system administrator.");
        setLoading(false);
        return; // Halt immediately, so we don't send emails to non-existent accounts
      }

      // 2. If exists, proceed to send standard authorized Supabase reset link
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      
      if (resetError) {
        setError(resetError.message);
      } else {
        setResetSent(true);
      }
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Invalid administrative credentials.");
      setLoading(false);
      return;
    }

    // Standard check for role-based access
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (roleError || !roles || roles.length === 0) {
      await supabase.auth.signOut();
      setError("Access Denied: Account not activated in Staff Hub.");
      setLoading(false);
      return;
    }

    const userRole = roles[0].role.toLowerCase();
    setLoading(false);

    // Dynamic Routing based on actual database clearance (app_role enum)
    if (userRole === 'admin' || userRole === 'manager') {
      navigate("/admin/dashboard");
    } else if (userRole === 'sales' || userRole === 'ops') {
      navigate("/admin/bookings");
    } else {
      navigate("/admin/dashboard");
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
            className=""
          >
            <div className="w-24 h-24 rounded-full bg-transparent shadow-xl flex items-center justify-center mx-auto mb-6 border-[3px] border-gold/50 hover:scale-105 transition-transform overflow-hidden relative">
              <img src="/logo-main.png" alt="Akbar Pura Travel Logo" className="w-[110%] h-[110%] object-cover mix-blend-multiply contrast-125 scale-110" />
            </div>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Staff Portal</h1>
          <p className="text-muted-foreground text-sm mt-1"> Secure Access Interface </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-3xl p-8 border border-border shadow-2xl shadow-black/5 space-y-6 relative overflow-hidden"
        >
          {/* Subtle top shine */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
            <div className="relative group">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background rounded-xl border border-input focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-medium transition-all"
                placeholder="admin@akbarpuratravels.com"
              />
            </div>
          </div>

          {!isResetMode && (
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-xs text-gold hover:underline font-bold"
                >
                  Forgot Password?
                </button>
              </div>
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
          )}

          {resetSent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-emerald-500 text-sm font-medium leading-tight">Password reset link sent to your email.</p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gold hover:bg-gold/90 text-secondary font-semibold shadow-md shadow-gold/20 hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3 group mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isResetMode ? "Send Reset Link" : "Sign In to Portal"}
                <Plane className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
              </>
            )}
          </button>

          {isResetMode && (
            <button
               type="button"
               onClick={() => {
                 setIsResetMode(false);
                 setResetSent(false);
                 setError("");
               }}
               className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4 font-medium"
            >
              Back to Login
            </button>
          )}
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Contact System Administrator for credential resets.<br />Unauthorized access is monitored.
        </p>
      </motion.div>
    </div>
  );
}
