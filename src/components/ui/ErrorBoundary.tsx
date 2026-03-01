import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Production-ready Error Boundary
 * Prevents the "White Screen of Death" by catching React errors
 * and showing a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-6">
                    <div className="max-w-md w-full bg-card rounded-2xl border border-destructive/20 p-8 text-center shadow-xl animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-foreground mb-4">Something went wrong</h1>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            We've encountered an unexpected error. Don't worry, your data is safe.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 bg-gold-gradient text-secondary rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-gold"
                            >
                                <RefreshCw className="w-4 h-4" /> Reload Workspace
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false })}
                                className="w-full py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/80 transition-all"
                            >
                                Try to Recover
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                            <pre className="mt-8 p-4 bg-muted/50 rounded-lg text-left text-[10px] text-destructive overflow-auto max-h-40 font-mono">
                                {this.state.error?.toString()}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
