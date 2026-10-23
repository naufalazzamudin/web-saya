import React, { useState, useEffect } from 'react';

export const RealTimeClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayName = days[now.getDay()];
  const dayNum = String(now.getDate()).padStart(2, '0');
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const dateFormatted = `${dayName}, ${dayNum} ${monthName} ${year}`;

  const timeFormatted = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div className="flex flex-col items-end text-right">
      <div className="text-xs font-semibold text-slate-700 tracking-tight whitespace-nowrap">
        {dateFormatted}
      </div>
      <div className="text-sm font-mono font-bold text-indigo-600 tracking-wider">
        {timeFormatted}
      </div>
    </div>
  );
};
