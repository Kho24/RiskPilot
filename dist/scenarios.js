const cardSource = {
  href: 'https://consumer.ftc.gov/articles/lost-or-stolen-credit-atm-and-debit-cards',
  label: 'FTC guide to lost or stolen cards ↗'
};
const scamSource = {
  href: 'https://consumer.ftc.gov/articles/what-do-if-you-were-scammed',
  label: 'FTC steps after a scam ↗'
};
const accountSource = {
  href: 'https://consumer.ftc.gov/consumer-alerts/2024/10/email-or-social-media-hacked-heres-what-do',
  label: 'FTC account recovery guide ↗'
};

const noCharges = /\b(?:no (?:unfamiliar|unauthorized|suspicious) (?:charges|transactions)|(?:don['’]t|didn['’]t) see (?:any|a charge)|no charges)\b/i;
const unfamiliarCharge = /\b(?:(?:unfamiliar|unauthorized|suspicious|fraudulent|unknown|weird) (?:charges?|transactions?)|charges? (?:I|we) (?:don['’]t recognize|didn['’]t make))\b/i;

export const scenarios = {
  card: {
    example: 'I lost my credit card. How worried should I be?',
    matches: text => /\b(?:(?:credit|debit|bank|payment) cards?|my card|my wallet)\b/i.test(text)
      && /\b(?:lost|missing|stolen|stole|misplaced|can['’]t find|left|fraud|charges?|transactions?|shared|entered|gave)\b/i.test(text),
    opening: [
      'I’d treat a missing or exposed card as urgent. Someone could use it while it’s still active.',
      'Report it now using your card issuer’s official app or a phone number from your statement. If the app offers a card lock, use it while you contact the issuer. Check recent activity and ask about a replacement.',
      'Have you seen any charges you don’t recognize? That tells us whether there’s possible misuse to report as well.'
    ],
    source: cardSource,
    answers: [
      {label:'Yes, an unfamiliar charge', matches:text => !noCharges.test(text) && (/^(yes|yeah|yep)\b/i.test(text) || unfamiliarCharge.test(text)),
       inMessage:text => !noCharges.test(text) && unfamiliarCharge.test(text),
       reply:'Possible fraud · Act now. Tell the issuer the card is missing or exposed and flag each charge you didn’t make. Ask how to dispute those charges and whether the issuer has blocked the card.'},
      {label:'No unfamiliar charges', matches:text => /^no\b/i.test(text) || noCharges.test(text), inMessage:noCharges.test.bind(noCharges),
       reply:'Still urgent while the card is missing or exposed. Report it now even if everything looks normal. Once the issuer confirms the old card is blocked, check later statements for charges that may have posted in the meantime.'},
      {label:'I haven’t checked', matches:text => /\b(?:not sure|haven['’]t checked|don['’]t know|unsure)\b/i.test(text),
       reply:'Report the card first. When you can, use the issuer’s official app or site to review pending and posted transactions. Flag anything you didn’t authorize.'}
    ]
  },
  phishing: {
    example: 'I clicked a suspicious text link. What now?',
    matches: text => /\b(?:phishing|suspicious (?:text|email|link|message)|scam (?:text|email|link|message)|fake (?:text|email|link|login|website|site)|clicked (?:a |the )?link|text (?:with|about) a link)\b/i.test(text),
    opening: [
      'Close the page and avoid going back through the link. If the message claims to be from a company, check through its official app or a site you already know.',
      'Did you enter a password or code, give payment details, or open a download? What happened after the click changes what to do next.'
    ],
    source: scamSource,
    answers: [
      {label:'I only clicked', matches:text => /\b(?:only|just) clicked\b|\b(?:didn['’]t|did not) (?:enter|give|share|download) anything\b|^(?:no|nothing)[.!]?$/i.test(text),
       reply:'Lower concern if you only opened the page and shared nothing. Close it, update your security software, and run a scan if you suspect the link downloaded anything.'},
      {label:'I entered a password or code', matches:text => /\b(?:password|code|login|credentials)\b/i.test(text),
       inMessage:text => /\b(?:I|we) (?:entered|shared|typed|gave (?:them )?)(?: (?:my|our|a|the))? (?:password|code|credentials)\b/i.test(text),
       reply:'High urgency · Secure the account through its official site. Change the password, sign out on other devices if possible, and enable two-step verification. If you shared a one-time code, check for unfamiliar sign-ins and use the provider’s recovery flow if you’re locked out.'},
      {label:'I gave payment details', matches:text => /\b(?:payment|bank|card)\b/i.test(text),
       reply:'Act now. Contact your bank or card issuer through its official app or statement number, explain what you shared, and ask how to block further use. Report any transaction you didn’t authorize.'},
      {label:'I opened a download', matches:text => /\b(?:download|attachment|file|installed)\b/i.test(text),
       reply:'Act promptly. For a work device, contact IT. For a personal device, update your security software and run a scan. If you think the device may be infected, use a separate trusted device to secure important accounts.'}
    ]
  },
  account: {
    example: 'Someone logged into my email. What should I do?',
    matches: text => /\b(?:hacked|compromised|leaked|exposed|stolen|logged (?:in|into)|signed (?:in|into)|reused|login alert|sign-in alert)\b/i.test(text)
      && /\b(?:email|password|account|login|sign-in|instagram|facebook)\b/i.test(text),
    opening: [
      'Treat an unfamiliar sign-in or exposed password as time-sensitive. Go directly to the service’s official site or app to check account activity.',
      'Can you still sign in to the account?'
    ],
    source: accountSource,
    answers: [
      {label:'I can still sign in', matches:text => /^(?:yes|yeah)\b|\b(?:can still|still have access)\b/i.test(text),
       reply:'Change the password to one you don’t use elsewhere, sign out on other devices, and turn on two-step verification. Check your recovery details and any recent activity you don’t recognize.'},
      {label:'I’m locked out', matches:text => /^(?:no|nope)\b|\b(?:locked out|can['’]t (?:sign|log) in|lost access)\b/i.test(text),
       reply:'Use the provider’s official account recovery process now. If you reused that password elsewhere, change it on those accounts too. Start with the email account you use for password resets.'}
    ]
  }
};

export function findScenario(text) {
  return Object.keys(scenarios).find(key => scenarios[key].matches(text));
}
