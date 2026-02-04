"use client";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{ padding: '2rem', color: 'red', border: '2px solid red', margin: '1rem', background: 'white' }}>
            <h2>Application Crash Detected!</h2>
            <p>Error Message: {error.message}</p>
            {error.digest && <p>Digest: {error.digest}</p>}
            <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>
                Try again
            </button>
        </div>
    );
}
