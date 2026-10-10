/**
 * MedSync Wellness Quotes
 * 30 warm, uplifting, pressure-free affirmations for the Patient Portal.
 */

export const WELLNESS_QUOTES = [
  "Healing isn't a straight line, and every small step still counts.",
  "You've handled hard days before. Today you get to be gentle with yourself.",
  "Your body has carried you through everything so far. Thank you, body.",
  "Small habits, repeated kindly, change everything.",
  "Rest is not giving up. It's part of getting stronger.",
  "Be proud of showing up for your health today.",
  "One good choice at a time is more than enough.",
  "You are more than your diagnosis.",
  "Give yourself credit for the things you manage quietly every day.",
  "Taking care of yourself is a practice, not a test to pass.",
  "Even a quiet day of rest is meaningful progress.",
  "Listen to what your body needs today, without comparison or hurry.",
  "You do not have to do everything all at once to make a difference.",
  "Patience with yourself is one of the kindest medicines.",
  "Notice the little comforts around you today. They count too.",
  "Showing up with care for yourself today is something to celebrate.",
  "Your pace is the right pace for you.",
  "Every deep breath is a quiet reminder that you are here, doing your best.",
  "Honor where your energy is today and let that be enough.",
  "Health is made of gentle choices, one ordinary moment at a time.",
  "It takes courage to ask questions and take charge of your care.",
  "You deserve the same kindness you so easily offer to others.",
  "A slower day is still a day moving in the right direction.",
  "Whatever today holds, remind yourself: you are doing the best you can.",
  "Small moments of peace can carry you through big seasons of care.",
  "Trust the steady rhythm of your own journey.",
  "Your well-being matters, and so does the time you take for it.",
  "Celebrate the small victories that only you know about.",
  "Be gentle with your thoughts today; healing takes room to breathe.",
  "You are worthy of care, rest, and peace, exactly as you are right now."
];

/**
 * Returns a random quote, avoiding repeating the previous quote in sessionStorage.
 */
export function getRandomWellnessQuote() {
  const count = WELLNESS_QUOTES.length;
  let lastIndex = -1;

  try {
    const stored = sessionStorage.getItem('medsync_last_quote');
    if (stored !== null) {
      lastIndex = parseInt(stored, 10);
    }
  } catch (err) {
    // Gracefully ignore sessionStorage restrictions if disabled
  }

  let nextIndex = Math.floor(Math.random() * count);
  if (count > 1 && nextIndex === lastIndex) {
    nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (count - 1))) % count;
  }

  try {
    sessionStorage.setItem('medsync_last_quote', String(nextIndex));
  } catch (err) {
    // Gracefully ignore storage quota/security errors
  }

  return WELLNESS_QUOTES[nextIndex];
}
