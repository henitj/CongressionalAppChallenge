/**
 * ═════════════════════════════════════════════════════════════════════════════
   FEEDBACK — THE ONE PLACE TO PASTE YOUR GOOGLE FORM LINKS
   ═════════════════════════════════════════════════════════════════════════════
 *
 * Everything feedback-related reads from this file. You will never have to
 * touch a screen to change the form — just fill in the three values below.
 *
 * HOW TO GET EACH VALUE (one-time, ~2 minutes):
 *
 * 1. FEEDBACK_FORM_URL
 *      Open your Google Form, press the "Send" button, click the link icon
 *      (🔗), and copy the link. It looks like:
 *        https://docs.google.com/forms/d/e/1FAIpQLSd.../viewform
 *      Paste the whole thing below.
 *
 * 2. FEEDBACK_SUBMIT_URL
 *      Take the link above and change the word `viewform` at the very end
 *      to `formResponse`. That is the address the star rating is POSTed to.
 *
 * 3. FEEDBACK_RATING_ENTRY
 *      In the Google Forms editor, click the ⋮ (three dots) on your star /
 *      rating question → "Get pre-filled link" → pick any answer → copy the
 *      link. Somewhere in that link you will see `entry.1234567890`.
 *      Copy just that `entry.1234567890` part (your number) below.
 *
 * Until these are filled in, the app still shows the feedback popup — it
 * just quietly skips the upload and tells the developer in the console, so
 * nothing ever crashes or nags the user with a broken link.
 */

/** The form people see in a browser (used by "Open the full form"). */
export const FEEDBACK_FORM_URL =
  process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL ??
  'https://docs.google.com/forms/d/e/PASTE-YOUR-FORM-ID-HERE/viewform';

/** The same form, but as a submit endpoint (used when you tap Submit). */
export const FEEDBACK_SUBMIT_URL =
  process.env.EXPO_PUBLIC_FEEDBACK_SUBMIT_URL ??
  'https://docs.google.com/forms/d/e/PASTE-YOUR-FORM-ID-HERE/formResponse';

/** The answer field id of the star-rating question in your form. */
export const FEEDBACK_RATING_ENTRY =
  process.env.EXPO_PUBLIC_FEEDBACK_RATING_ENTRY ?? 'entry.PASTE-STAR-QUESTION-ID-HERE';

/** Storage key (per user) remembering that the after-hike popup already showed. */
export const FEEDBACK_PROMPT_KEY = 'feedback_prompt_shown';

const PLACEHOLDER_BITS = ['PASTE-YOUR-FORM-ID-HERE', 'PASTE-STAR-QUESTION-ID-HERE'];

/** True once the two links above have been replaced with real ones. */
export function isFeedbackConfigured(): boolean {
  const all = FEEDBACK_SUBMIT_URL + FEEDBACK_RATING_ENTRY;
  return !PLACEHOLDER_BITS.some((bit) => all.includes(bit));
}

/** Builds the little form body that carries the star rating. */
export function buildFeedbackBody(rating: number): string {
  // URLSearchParams does the escaping for us; Google Forms expects
  // application/x-www-form-urlencoded bodies exactly like a browser submit.
  const params = new URLSearchParams();
  params.append(FEEDBACK_RATING_ENTRY, String(rating));
  return params.toString();
}

/**
 * Posts a 1–5 star rating to the Google Form. Best-effort by design:
 * Google does not let apps read the response back, so we fire the submit
 * and trust it — the caller shows a thank-you either way, and a failure
 * never blocks or crashes the app.
 *
 * Returns true when the rating was sent (or dev-logged because the links
 * have not been pasted in yet), false only if the network call itself threw.
 */
export async function submitFeedbackRating(rating: number): Promise<boolean> {
  if (!isFeedbackConfigured()) {
    // The team has not pasted the links in yet (see the top of this file).
    // Log it loudly in development so it gets fixed before shipping.
    if (__DEV__) {
      console.warn(
        '[feedback] Google Form links are not set yet — paste them into src/constants/feedback.ts'
      );
    }
    return true;
  }

  try {
    await fetch(FEEDBACK_SUBMIT_URL, {
      method: 'POST',
      // no-cors: we only need the request to reach Google; the answer is
      // opaque on the web either way.
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildFeedbackBody(rating),
    });
    return true;
  } catch (e) {
    console.warn('[feedback] could not reach the form', e);
    return false;
  }
}
