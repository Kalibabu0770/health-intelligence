import React, { useEffect } from 'react';

const GoogleTranslate: React.FC = () => {
  useEffect(() => {
    // 1. Add the div if it doesn't exist
    if (!document.getElementById('google_translate_element')) {
      const gdiv = document.createElement('div');
      gdiv.id = 'google_translate_element';
      // Keeping it hidden by default as requested in the old CSS pattern
      gdiv.style.position = 'absolute';
      gdiv.style.top = '-9999px';
      document.body.appendChild(gdiv);
    }

    // 2. Clear old scripts to prevent duplicates
    const existingScript = document.getElementById('google-translate-script');
    if (existingScript) existingScript.remove();

    // 3. Inject the Google Translate init function to window
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
      }, 'google_translate_element');
    };

    // 4. Inject the external script
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount if we want to turn it off when switching to doctor
      const gdiv = document.getElementById('google_translate_element');
      if (gdiv) gdiv.remove();
      const gs = document.getElementById('google-translate-script');
      if (gs) gs.remove();
      delete (window as any).googleTranslateElementInit;
      
      // Force remove the browser banner if it injected one
      const banner = document.querySelector('.goog-te-banner-frame');
      if (banner) banner.remove();
      document.body.style.top = '0';
    };
  }, []);

  return null; // This is a logic-only component
};

export default GoogleTranslate;
