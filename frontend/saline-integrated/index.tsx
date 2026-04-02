import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Mounting App...');
const root = document.getElementById('root');
console.log('Root element:', root);


// Simple Error Boundary Implementation

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}


class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    constructor(props: ErrorBoundaryProps) {
        super(props);
    }


    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red', fontFamily: 'sans-serif' }}>
                    <h1>Something went wrong.</h1>
                    <pre style={{ background: '#fef2f2', padding: 10, borderRadius: 5, overflow: 'auto' }}>
                        {this.state.error?.toString()}
                        <br />
                        {this.state.error?.stack}
                    </pre>
                    <button onClick={() => window.location.reload()} style={{ marginTop: 10, padding: 10 }}>
                        Reload App
                    </button>
                </div>
            );
        }

        return (this as any).props.children;
    }
}

if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </React.StrictMode>
    );
}
