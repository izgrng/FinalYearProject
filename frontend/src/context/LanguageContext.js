import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const translations = {
  en: {
    navDashboard: "Dashboard",
    navHowItWorks: "How it works",
    navCommunity: "Community Hub",
    navReport: "Report Issue",
    navLogin: "Login",
    navSignup: "Sign Up",
    navProfile: "Profile",
    heroBadge: "Built for local communities",
    heroTitle:
      "Report local problems, see what is happening nearby, and turn scattered concerns into visible action.",
    heroBody:
      "Fixify is an AI-assisted civic reporting platform for people who want a clearer picture of road damage, waste build-up, water issues, and public safety concerns in their community.",
    heroPrimary: "Create Free Account",
    heroPrimaryLoggedIn: "Report an Issue",
    heroSecondary: "Explore Dashboard",
    homeWhy: "Why Fixify?",
    homeHow: "How it works",
    chatbotGreeting:
      "Hi! I'm Fixi, your friendly AI assistant. How can I help you today? I can guide you on reporting issues, explain how Fixify works, or share civic awareness tips!",
    chatbotTitle: "Fixi AI",
    chatbotPlaceholder: "Ask about reports, categories, maps...",
    languageLabel: "Language",
  },
  np: {
    navDashboard: "ड्यासबोर्ड",
    navHowItWorks: "कसरी काम गर्छ",
    navCommunity: "समुदाय हब",
    navReport: "समस्या रिपोर्ट",
    navLogin: "लगइन",
    navSignup: "साइन अप",
    navProfile: "प्रोफाइल",
    heroBadge: "स्थानीय समुदायका लागि बनाइएको",
    heroTitle:
      "स्थानीय समस्या रिपोर्ट गर्नुहोस्, वरिपरि के भइरहेको छ हेर्नुहोस्, र छरिएका गुनासाहरूलाई देखिने कार्यमा बदल्नुहोस्।",
    heroBody:
      "Fixify एउटा AI-सहयोगी नागरिक रिपोर्टिङ प्लेटफर्म हो, जसले सडक क्षति, फोहोर, पानी समस्या र सार्वजनिक सुरक्षाजस्ता विषयलाई स्पष्ट रूपमा देख्न मद्दत गर्छ।",
    heroPrimary: "निःशुल्क खाता बनाउनुहोस्",
    heroPrimaryLoggedIn: "समस्या रिपोर्ट गर्नुहोस्",
    heroSecondary: "ड्यासबोर्ड हेर्नुहोस्",
    homeWhy: "किन Fixify?",
    homeHow: "कसरी काम गर्छ",
    chatbotGreeting:
      "नमस्ते! म Fixi हुँ, तपाईंको AI सहयोगी। म तपाईंलाई समस्या रिपोर्ट गर्न, Fixify कसरी काम गर्छ भन्ने बुझाउन, वा नागरिक सचेतनाबारे जानकारी दिन सक्छु।",
    chatbotTitle: "फिक्सी एआई",
    chatbotPlaceholder: "रिपोर्ट, श्रेणी वा नक्साबारे सोध्नुहोस्...",
    languageLabel: "भाषा",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem("fixify-language") || "en");

  useEffect(() => {
    localStorage.setItem("fixify-language", language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language] || translations.en,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
