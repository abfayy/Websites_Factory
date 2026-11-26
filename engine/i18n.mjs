// UI labels per site language. Customer-facing copy itself (headline, services, ...) is written by the
// starter-worker agent in the chosen language; these are only the fixed labels the template adds.
export const LANGUAGES = ['en', 'ur', 'roman-ur'];

export const LABELS = {
  en: {
    htmlLang: 'en', dir: 'ltr',
    about: 'About us', services: 'Services', gallery: 'Gallery', testimonials: 'What customers say', faq: 'FAQ', contact: 'Contact us',
    whatsapp: 'Chat on WhatsApp', call: 'Call now', email: 'Email us', map: 'Open in Google Maps',
    hours: 'Opening hours', address: 'Address', phone: 'Phone', skip: 'Skip to content', menu: 'Sections', rights: 'All rights reserved.'
  },
  ur: {
    htmlLang: 'ur', dir: 'rtl',
    about: 'ہمارے بارے میں', services: 'ہماری خدمات', gallery: 'گیلری', testimonials: 'ہمارے صارفین کیا کہتے ہیں', faq: 'اکثر پوچھے گئے سوالات', contact: 'رابطہ کریں',
    whatsapp: 'واٹس ایپ پر بات کریں', call: 'ابھی کال کریں', email: 'ای میل کریں', map: 'گوگل میپس پر دیکھیں',
    hours: 'اوقاتِ کار', address: 'پتہ', phone: 'فون', skip: 'مواد پر جائیں', menu: 'حصے', rights: 'جملہ حقوق محفوظ ہیں۔'
  },
  'roman-ur': {
    htmlLang: 'ur-Latn', dir: 'ltr',
    about: 'Hamare baare mein', services: 'Hamari services', gallery: 'Gallery', testimonials: 'Customers kya kehte hain', faq: 'Aksar pooche gaye sawalat', contact: 'Rabta karein',
    whatsapp: 'WhatsApp par baat karein', call: 'Abhi call karein', email: 'Email karein', map: 'Google Maps par dekhein',
    hours: 'Kaam ke auqaat', address: 'Pata', phone: 'Phone', skip: 'Content par jayein', menu: 'Sections', rights: 'Tamam huqooq mehfooz hain.'
  }
};

export function labelsFor(language) {
  return LABELS[language] || LABELS.en;
}
