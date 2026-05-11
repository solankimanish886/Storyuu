import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center text-white">
      <p className="text-display-xl text-brand-orange">404</p>
      <h1 className="mt-4 text-display-l">We couldn't find that page.</h1>
      <p className="mt-3 max-w-md text-subheading text-neutral-300">
        The story you're looking for might have moved, or never existed. Try one of these:
      </p>
      <div className="mt-8 flex gap-4">
        <Link to="/" className="btn-outlined">Back home</Link>
        <Link to="/channels" className="btn-primary-cyan">Browse channels</Link>
      </div>
    </div>
  );
}
