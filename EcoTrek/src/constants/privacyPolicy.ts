/**
 * The full EcoTrek privacy policy, embedded in the app so it can be shown
 * and consented to without a network connection.
 *
 * PRIVACY_POLICY_VERSION identifies the revision a user accepted. Bump it
 * whenever the policy text changes materially and every account will be
 * asked to review and accept the new version on their next launch.
 */

export const PRIVACY_POLICY_VERSION = '2026-09-19';
export const PRIVACY_POLICY_LAST_UPDATED = 'September 19, 2026';
export const PRIVACY_CONTACT_EMAIL = 'ecotrek26@gmail.com';

export type PolicyBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullets'; items: string[] };

export const PRIVACY_POLICY: PolicyBlock[] = [
  {
    type: 'p',
    text:
      'EcoTrek ("EcoTrek," "we," "us," or "our") is a free application created by a small student team for the Congressional App Challenge. This Privacy Policy explains what information we collect, why we collect it, how we use it, and the choices you have regarding your information.',
  },
  {
    type: 'p',
    text:
      'We do not sell your personal information. We collect only the information reasonably necessary to provide, maintain, secure, and improve EcoTrek, including providing personalized and location-based recommendations.',
  },

  { type: 'h2', text: 'Information We Collect' },

  { type: 'h3', text: 'Information You Provide' },
  {
    type: 'p',
    text:
      'Depending on how you use EcoTrek, we may collect information that you voluntarily provide, such as:',
  },
  {
    type: 'bullets',
    items: [
      'Your name;',
      'Email address;',
      'Account information;',
      'Preferences or information you provide when using EcoTrek; and',
      'Information you provide when contacting us for support.',
    ],
  },

  { type: 'h3', text: 'Location Information' },
  {
    type: 'p',
    text: "EcoTrek may request permission to access your device's location information.",
  },
  {
    type: 'p',
    text:
      'We use location information to provide location-based recommendations and features within EcoTrek. For example, your location may be used to help identify recommendations that are relevant to your current area.',
  },
  {
    type: 'p',
    text:
      "Location access is controlled through your device's permission settings. You can disable location access at any time through your device settings. If you disable location access, certain EcoTrek features or recommendations may not work as intended.",
  },

  { type: 'h3', text: 'Automatically Collected Information' },
  {
    type: 'p',
    text:
      'When you use EcoTrek, we may automatically collect limited technical and usage information, such as:',
  },
  {
    type: 'bullets',
    items: [
      'IP address;',
      'Device type and operating system;',
      'Application version;',
      'General information about how you use the Application;',
      'Dates and times of access; and',
      'Diagnostic, security, and error information.',
    ],
  },
  {
    type: 'p',
    text:
      'We use this information to operate EcoTrek, troubleshoot problems, maintain security, understand how features are used, and improve the Application.',
  },

  { type: 'h2', text: 'How We Use Your Information' },
  { type: 'p', text: 'We may use information we collect to:' },
  {
    type: 'bullets',
    items: [
      'Provide and maintain EcoTrek;',
      'Provide personalized and location-based recommendations;',
      'Respond to questions and support requests;',
      'Improve EcoTrek and develop new features;',
      'Monitor and maintain the security of the Application;',
      'Diagnose and fix technical problems; and',
      'Comply with applicable laws and legal obligations.',
    ],
  },
  {
    type: 'p',
    text:
      "We do not use your location information for purposes unrelated to providing or improving EcoTrek's features unless we obtain your permission or are otherwise permitted or required by law.",
  },

  { type: 'h2', text: 'How We Share Your Information' },
  { type: 'p', text: 'We do not sell your personal information.' },
  {
    type: 'p',
    text:
      'We may share limited information with service providers that help us operate EcoTrek, such as providers of hosting, databases, analytics, security, or other technical infrastructure. These providers receive information only as reasonably necessary to provide services to EcoTrek.',
  },
  { type: 'p', text: 'We may also disclose information when reasonably necessary to:' },
  {
    type: 'bullets',
    items: [
      'Comply with a legal obligation or valid legal request;',
      'Protect the security or integrity of EcoTrek;',
      'Prevent fraud, abuse, or other unlawful activity; or',
      'Protect the rights, safety, or property of EcoTrek, its users, or others.',
    ],
  },
  {
    type: 'p',
    text:
      'We do not share your personal information with third parties for their own advertising or marketing purposes.',
  },

  { type: 'h2', text: 'Data Retention' },
  {
    type: 'p',
    text:
      'We keep personal information only for as long as reasonably necessary to provide EcoTrek, maintain its security, comply with legal obligations, resolve disputes, and enforce applicable agreements.',
  },
  {
    type: 'p',
    text:
      'When information is no longer reasonably necessary, we may delete it, anonymize it, or securely dispose of it, subject to technical limitations such as encrypted backups.',
  },

  { type: 'h2', text: 'Deleting or Updating Your Information' },
  {
    type: 'p',
    text:
      'You may request access to, correction of, or deletion of personal information that we maintain about you.',
  },
  {
    type: 'p',
    text: `You can contact us at ${PRIVACY_CONTACT_EMAIL} to make a request.`,
  },
  {
    type: 'p',
    text:
      'We may need to verify your identity before completing a request. We may also retain certain information when required or permitted by law or when reasonably necessary for security, legal, or operational purposes.',
  },

  { type: 'h2', text: 'Security' },
  {
    type: 'p',
    text:
      'We take reasonable measures to protect information collected through EcoTrek. However, no method of transmitting or storing information electronically is completely secure. We cannot guarantee the absolute security of your information.',
  },

  { type: 'h2', text: "Children's Privacy" },
  {
    type: 'p',
    text:
      'EcoTrek is not intended for children under 13, and we do not knowingly collect personal information from children under 13.',
  },
  {
    type: 'p',
    text: `If you believe that a child under 13 has provided personal information to us, please contact us at ${PRIVACY_CONTACT_EMAIL}. If we learn that we have collected personal information from a child under 13 without appropriate authorization, we will take reasonable steps to delete it.`,
  },
  {
    type: 'p',
    text:
      'Where applicable law provides additional privacy protections for minors, we will comply with those requirements.',
  },

  { type: 'h2', text: 'California Privacy Disclosures' },
  {
    type: 'p',
    text:
      'This section provides additional information for California residents regarding their privacy rights and is intended to address applicable requirements of the California Online Privacy Protection Act (CalOPPA).',
  },

  { type: 'h3', text: 'Categories of Information We Collect' },
  {
    type: 'p',
    text:
      'Depending on how you use EcoTrek, we may collect the following categories of information:',
  },
  {
    type: 'bullets',
    items: [
      'Identifiers: such as name and email address;',
      'Internet or electronic activity information: such as IP address, application usage, and diagnostic information;',
      'Device information: such as device type, operating system, and application version;',
      'Geolocation information: when you give EcoTrek permission to access your location; and',
      'Other information you voluntarily provide: such as preferences or support communications.',
    ],
  },

  { type: 'h3', text: 'Sources of Information' },
  {
    type: 'p',
    text:
      'We may collect information directly from you, automatically from your device when you use EcoTrek, or from service providers that help us operate the Application.',
  },

  { type: 'h3', text: 'Categories of Third Parties' },
  {
    type: 'p',
    text:
      'We may provide information to service providers that assist with hosting, databases, analytics, security, application infrastructure, or other technical services. We do not sell personal information or provide it to third parties for their own advertising or marketing purposes.',
  },

  { type: 'h3', text: 'California Privacy Requests' },
  {
    type: 'p',
    text:
      'California residents may contact us to request access to, correction of, or deletion of personal information that we maintain about them, subject to applicable law and applicable exceptions.',
  },
  {
    type: 'p',
    text: `Requests may be submitted by email to ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    type: 'p',
    text: 'We may take reasonable steps to verify your identity before processing a request.',
  },

  { type: 'h3', text: 'Do Not Track' },
  {
    type: 'p',
    text:
      'Some browsers and devices provide a "Do Not Track" setting. EcoTrek does not currently respond to Do Not Track signals.',
  },

  { type: 'h2', text: 'Changes to This Privacy Policy' },
  {
    type: 'p',
    text:
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date above and, where the changes are material, ask you to review and accept the updated policy inside the app before continuing.',
  },

  { type: 'h2', text: 'Contact Us' },
  {
    type: 'p',
    text: `If you have any questions about this Privacy Policy or our practices, contact us at ${PRIVACY_CONTACT_EMAIL}.`,
  },
];
