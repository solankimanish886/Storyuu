import { Link } from 'react-router-dom';

export default function ServerError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center text-white">
      <p className="text-display-xl text-brand-orange">500</p>
      <h1 className="mt-4 text-display-l">Something went wrong on our end.</h1>
      <p className="mt-3 max-w-md text-subheading text-neutral-300">
        Please try again in a moment.
      </p>
      <Link to="/" className="btn-primary-cyan mt-8">Back home</Link>
    </div>
  );
}
