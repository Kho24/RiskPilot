export const practiceCases = {
  card: {
    setup: 'You get home from a café and realize your credit card is missing. You can still open your card issuer’s app. What would you do first?',
    choices: [
      {
        label: 'Lock it and report it',
        matches: /\b(?:lock|freeze|report|call|contact|cancel|block)\b/i,
        feedback: 'Good first move. A lock can help limit new use while you report the card missing to the issuer.',
        next: 'While checking the app, you spot a purchase you didn’t make. What do you tell the issuer?'
      },
      {
        label: 'Wait to see if it turns up',
        matches: /\b(?:wait|look|search|café|cafe|tomorrow)\b/i,
        feedback: 'Looking for it makes sense. While you search, an active card could still be used. Report the loss promptly and use the app’s lock if available.',
        next: 'While you’re looking for it, the app alerts you to a purchase you didn’t make. What do you tell the issuer?'
      }
    ],
    followUp: [
      {label:'Report the missing card and the charge', matches:/\b(?:report|dispute|flag|tell|call|contact)\b/i,
       feedback:'Exactly. Give the issuer both facts so they can address the missing card and explain how to dispute the charge.'},
      {label:'Wait until the charge posts', matches:/\b(?:wait|posts?|ignore|tomorrow)\b/i,
       feedback:'Tell the issuer now. They can advise when you can formally dispute the transaction and take steps to prevent more charges.'}
    ],
    takeaway: 'What changed? A missing card was already urgent. An unfamiliar charge adds a sign of possible misuse.'
  },
  phishing: {
    setup: 'A text says your package is on hold until you pay a small fee. It includes a link and says you have 10 minutes. What would you do?',
    choices: [
      {
        label:'Check through the carrier’s official app',
        matches:/\b(?:official|tracking|carrier|verify|known|ignore|delete|don['’]t click|avoid)\b/i,
        feedback:'Good instinct. Checking independently lets you verify the claim without handing information to whoever sent the text.',
        next:'A friend got the same text and typed in their account password. What would you tell them to do first?'
      },
      {
        label:'Open the link and pay the fee',
        matches:/\b(?:pay|open|click|tap|link)\b/i,
        feedback:'The deadline makes it tempting. That pressure is a reason to slow down and check the shipment through a trusted app or website.',
        next:'In this scenario, the link led to a fake sign-in page and you entered your password. What would you do next?'
      }
    ],
    followUp: [
      {label:'Change the password on the official site', matches:/\b(?:change|reset|secure|sign out|two-step|2fa)\b/i,
       feedback:'Yes. Use the official site to change the exposed password and sign out other sessions where possible. Change it anywhere else it was reused.'},
      {label:'Delete the text and move on', matches:/\b(?:delete|ignore|wait|nothing)\b/i,
       feedback:'Deleting the text leaves the exposed password usable. Change it through the official site and review account activity.'}
    ],
    takeaway:'What changed? Receiving a suspicious message and giving someone a password call for different actions.'
  },
  account: {
    setup:'You spot an email sign-in from a device you don’t recognize. You can still get into your account. What do you do first?',
    choices:[
      {
        label:'Change my password and sign out other devices',
        matches:/\b(?:change|reset|sign out|secure|log out)\b/i,
        feedback:'That helps cut off access. Use a unique password and turn on two-step verification.',
        next:'After securing the account, you find a rule forwarding your email to an unfamiliar address. What would you do with it?'
      },
      {
        label:'Wait for another alert',
        matches:/\b(?:wait|ignore|monitor|nothing)\b/i,
        feedback:'An unfamiliar sign-in is enough to check the account directly. If you can get in, change the password and sign out other sessions.',
        next:'You open account settings and see a rule forwarding your mail to an unfamiliar address. What would you do with it?'
      }
    ],
    followUp:[
      {label:'Remove the rule and review recovery settings', matches:/\b(?:remove|disable|delete|turn off|recovery)\b/i,
       feedback:'Right. Remove the unfamiliar rule and check whether the recovery phone or email was changed.'},
      {label:'Leave it because I changed my password', matches:/\b(?:leave|keep|ignore|nothing)\b/i,
       feedback:'A forwarding rule can keep sending copies after a password change. Remove the unfamiliar rule and review recovery settings.'}
    ],
    takeaway:'What changed? Getting back in is one step. Checking account settings helps you spot ways someone could keep receiving your information.'
  }
};
