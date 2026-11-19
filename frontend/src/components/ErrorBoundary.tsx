import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Catches render errors anywhere in the student app so a single bad component
 * (malformed API payload, corrupted localStorage, etc.) doesn't blank the whole
 * screen. Shows a recovery UI with a refresh button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the error out of the console noise floor in production but still log it.
    if (import.meta.env.DEV) {
      console.error('[Campmatch ErrorBoundary]', error, errorInfo.componentStack)
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback
      if (fallback) return fallback
      return (
        <div
          style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            color: 'var(--text-secondary)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ff6b7a', marginBottom: 10 }}>
            Something went wrong
          </div>
          {this.state.error && (
            <div style={{ fontSize: 13, maxWidth: 420, marginBottom: 16 }}>
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.reset}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--tinder-pink)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Refresh app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
