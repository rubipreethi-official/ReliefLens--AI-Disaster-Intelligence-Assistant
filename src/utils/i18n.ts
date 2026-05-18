/**
 * i18n.ts
 *
 * Simple translation utility for ReliefLens.
 * Supports English (en) and Tamil (ta) by default.
 */

export type SupportedLanguage = 'English' | 'Tamil';

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  English: {
    'nav.report': 'Report',
    'nav.disasters': 'Recent Disasters',
    'nav.aria': 'ARIA',
    'nav.commander': 'Commander',
    'hero.title': 'RELIEFLENS',
    'hero.subtitle': 'Disaster Decision Acceleration System',
    'hero.report': 'Report Incident',
    'hero.commander': 'Commander Access',
    'report.title': 'Report an Incident',
    'report.subtitle': 'Multi-modal AI Triage Node',
    'report.visual': 'Visual Intake Sensor',
    'report.voice': 'Voice Note',
    'report.text': 'Text Description',
    'report.analyze': 'Analyze Incident',
    'report.speak_aria': 'Speak with ARIA',
    'cards.assessed': 'Assessed Incidents',
    'cards.active': 'active reports',
    'aria.greeting': 'Hello, I am ARIA. How can I help you today?',
    'aria.language_ask': 'I detected your location. Would you like to proceed in Tamil or English?',
    'aria.hold_to_speak': 'Hold to Speak',
  },
  Tamil: {
    'nav.report': 'அறிக்கை',
    'nav.disasters': 'சமீபத்திய பேரிடர்கள்',
    'nav.aria': 'அரியா',
    'nav.commander': 'தளபதி',
    'hero.title': 'ரிலீஃப்லென்ஸ்',
    'hero.subtitle': 'பேரிடர் முடிவு முடுக்க அமைப்பு',
    'hero.report': 'சம்பவத்தைப் புகாரளிக்கவும்',
    'hero.commander': 'தளபதி அணுகல்',
    'report.title': 'ஒரு சம்பவத்தைப் புகாரளிக்கவும்',
    'report.subtitle': 'மல்டி-மாடல் AI ட்ரைஜ் நோட்',
    'report.visual': 'விஷுவல் உட்கொள்ளல் சென்சார்',
    'report.voice': 'குரல் குறிப்பு',
    'report.text': 'உரை விளக்கம்',
    'report.analyze': 'சம்பவத்தை பகுப்பாய்வு செய்யுங்கள்',
    'report.speak_aria': 'அரியாவுடன் பேசுங்கள்',
    'cards.assessed': 'மதிப்பிடப்பட்ட சம்பவங்கள்',
    'cards.active': 'செயலில் உள்ள அறிக்கைகள்',
    'aria.greeting': 'வணக்கம், நான் அரியா. இன்று உங்களுக்கு நான் எப்படி உதவ முடியும்?',
    'aria.language_ask': 'உங்கள் இருப்பிடத்தை நான் கண்டறிந்தேன். நீங்கள் தமிழில் அல்லது ஆங்கிலத்தில் தொடர விரும்புகிறீர்களா?',
    'aria.hold_to_speak': 'பேச அழுத்தவும்',
  }
};

export function t(key: string, lang: string = 'English'): string {
  const dict = translations[lang as SupportedLanguage] || translations.English;
  return dict[key] || key;
}
