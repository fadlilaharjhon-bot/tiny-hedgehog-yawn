import { Sun, Moon } from "lucide-react";

interface WelcomeHeaderProps {
  username: string;
}

const WelcomeHeader = ({ username }: WelcomeHeaderProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { message: "Selamat Pagi", Icon: Sun };
    if (hour < 18) return { message: "Selamat Siang", Icon: Sun };
    return { message: "Selamat Malam", Icon: Moon };
  };

  const { message, Icon } = getGreeting();

  return (
    <div className="flex items-center gap-6 p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 mb-6">
      {/* Simple Cartoon Avatar SVG */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <circle cx="60" cy="60" r="58" fill="url(#avatar-gradient)" />
        <mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="15" y="25" width="90" height="85">
          <path d="M60 110C87.6142 110 110 87.6142 110 60C110 32.3858 87.6142 10 60 10C32.3858 10 10 32.3858 10 60C10 78.56 20.63 94.5 35 102V110H85V102C99.37 94.5 110 78.56 110 60Z" fill="white"/>
        </mask>
        <g mask="url(#mask0)">
          <circle cx="60" cy="55" r="45" fill="#F3E8D8" />
          <path d="M40 75C40 69.4772 44.4772 65 50 65H70C75.5228 65 80 69.4772 80 75V110H40V75Z" fill="#60A5FA" />
          <circle cx="45" cy="55" r="5" fill="#2F2E2A" />
          <circle cx="75" cy="55" r="5" fill="#2F2E2A" />
          <path d="M55 70C55 67.2386 57.2386 65 60 65C62.7614 65 65 67.2386 65 70" stroke="#2F2E2A" strokeWidth="3" strokeLinecap="round" />
          <path d="M35 45C40 -5 80 -5 85 45" stroke="#4A3F37" strokeWidth="8" strokeLinecap="round" fill="none"/>
        </g>
        <defs>
          <linearGradient id="avatar-gradient" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8"/>
            <stop offset="1" stopColor="#a78bfa"/>
          </linearGradient>
        </defs>
      </svg>

      <div>
        <div className="flex items-center gap-2 text-xl font-medium text-slate-200">
          <Icon className="w-6 h-6" />
          <span>{message},</span>
        </div>
        <h1 className="text-4xl font-bold text-white capitalize">{username}!</h1>
        <p className="text-slate-300 mt-1">Ini adalah ringkasan status lampu teras Anda.</p>
      </div>
    </div>
  );
};

export default WelcomeHeader;