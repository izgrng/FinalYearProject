import { useEffect, useState } from "react";
import { Button } from "./ui/button";

const STORAGE_KEY = "fixify_cookie_consent";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const handleChoice = (choice) => {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">We use cookies</p>
          <p className="text-xs text-slate-600">
            Fixify uses cookies to keep you signed in and improve your experience.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleChoice("declined")}>
            Decline
          </Button>
          <Button onClick={() => handleChoice("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
