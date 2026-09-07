"use client";

import { useEffect, useState } from "react";

function getTimeLeft(deadline: Date) {
  const diff = deadline.getTime() - Date.now();
  return {
    diff,
    days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
    hours: Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24)),
    minutes: Math.max(0, Math.floor((diff / (1000 * 60)) % 60)),
    seconds: Math.max(0, Math.floor((diff / 1000) % 60)),
  };
}

export default function CountdownTimer({ deadline }: { deadline: Date }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const deadlineLabel = deadline.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (timeLeft.diff <= 0) {
    return <p className="text-sm font-medium text-red-400">Submissions are now closed.</p>;
  }

  return (
    <p className="text-sm font-medium text-gray-300">
      Deadline in {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      &nbsp;({deadlineLabel})
    </p>
  );
}
