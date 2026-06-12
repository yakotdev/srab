import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

/**
 * يمنع سقوط التطبيق إلى شاشة بيضاء عند خطأ تصيير أثناء التنقل؛ يعرض واجهة بسيطة مع إمكانية الإنعاش.
 */
export class StorefrontErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[StorefrontErrorBoundary]', error, info.componentStack);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-16 bg-slate-50 text-slate-800"
          role="alert"
        >
          <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600 text-center max-w-md">
            The page hit an unexpected error. You can try again or return home.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-red-700 max-w-lg overflow-auto p-3 bg-red-50 rounded border border-red-100">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              onClick={this.handleRetry}
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
            >
              Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
