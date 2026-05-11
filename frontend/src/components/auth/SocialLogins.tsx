import { api } from '@/lib/api';

export default function SocialLogins() {
  const handleGoogleLogin = () => {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 py-3 rounded-xl text-[13px] font-bold hover:bg-neutral-100 transition-colors shadow-sm"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          className="w-4 h-4"
        />
        <span>Google Account</span>
      </button>
    </div>
  );
}
