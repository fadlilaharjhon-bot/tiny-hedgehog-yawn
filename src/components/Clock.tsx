import { useState, useEffect } from 'react';
import { Calendar, Clock as ClockIcon } from 'lucide-react';

const RealTimeClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex items-center gap-4 text-slate-300 text-sm mt-2">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span>{formatDate(currentTime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <ClockIcon className="w-4 h-4" />
        <span className="font-mono">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
};

export default RealTimeClock;