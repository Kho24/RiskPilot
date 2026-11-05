const conversation = document.getElementById('conversation');
const suggestions = document.getElementById('suggestions');
const form = document.getElementById('chat-form');
const question = document.getElementById('question');
let lesson = -1;

const topics = {
  tutorial: 'Start the 2-minute walkthrough',
  why: 'Why should I care?',
  demo: 'Try an example',
  next: 'Next step',
  cve: 'What is a CVE?',
  workbench: 'I have a vulnerability to check'
};

const lessons = [
  ['Step 1 of 3 · Understand the flaw',
   'Think of a door lock with a design flaw. A software vulnerability is a flaw someone might use to do something the software was meant to prevent. A public flaw often gets a CVE ID so everyone can refer to the same issue.'],
  ['Step 2 of 3 · Figure out what’s at stake',
   'Picture two websites running the same flawed software. One is a private practice site. The other takes customer orders. The flaw is the same, but an outage or exposed customer information could make the second one more urgent. RiskPilot asks about the system to help you decide what to check first.'],
  ['Step 3 of 3 · Decide what to do',
   'First, confirm your system uses the affected software and version. Then ask the system owner to check the vendor’s fix and test the change. RiskPilot gives you a plan and points out which details still need a human to verify.']
];

function appendTurn(speaker, paragraphs, link) {
  const turn = document.createElement('div');
  turn.className = speaker === 'You' ? 'turn user' : 'turn';
  const label = document.createElement('span');
  label.className = 'speaker';
  label.textContent = speaker;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  for (const text of paragraphs) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    bubble.append(paragraph);
  }
  if (link) {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    bubble.append(anchor);
  }
  turn.append(label, bubble);
  conversation.append(turn);
  conversation.scrollTop = conversation.scrollHeight;
}

function offer(...options) {
  suggestions.replaceChildren(...options.map(topic => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion';
    button.dataset.topic = topic;
    button.textContent = topics[topic];
    return button;
  }));
}

function showLesson(step) {
  lesson = step;
  appendTurn('RiskPilot', lessons[step]);
  if (step < lessons.length - 1) offer('next', 'demo');
  else offer('demo', 'workbench');
}

function reply(text, topic) {
  appendTurn('You', [text]);
  const cve = text.match(/\bCVE-\d{4}-\d{4,20}\b/i)?.[0].toUpperCase();
  if (cve) {
    appendTurn('RiskPilot', [
      'I found ' + cve + ' in your message. Open the assessment to look up the public record and see what to verify for your system.',
      'If you don’t know a detail about the system, leave it as Unknown.'
    ], {href:'assessment.html?cve=' + encodeURIComponent(cve), label:'Assess ' + cve + ' →'});
    offer('cve', 'demo', 'tutorial');
    return;
  }
  if (!topic) {
    if (/^(next|continue|next step)[.!]?$/i.test(text) && lesson >= 0 && lesson < lessons.length - 1) topic = 'next';
    else if (/\b(tutorial|walkthrough|beginner|start|basics)\b/i.test(text)) topic = 'tutorial';
    else if (/\b(example|demo|log4shell)\b/i.test(text)) topic = 'demo';
    else if (/\b(cve|vulnerability|vulnerabilities|patch)\b/i.test(text)) topic = 'cve';
    else if (/\b(why|care|risk|important|security|cybersecurity|hack)\b/i.test(text)) topic = 'why';
    else if (/\b(assess|check|workbench|scan)\b/i.test(text)) topic = 'workbench';
  }
  switch (topic) {
    case 'tutorial':
      showLesson(0);
      break;
    case 'next':
      showLesson(lesson + 1);
      break;
    case 'why':
      appendTurn('RiskPilot', [
        'A software flaw can interrupt an important service or expose customer information. Imagine your booking site goes down on the busiest day of the year. The business impact is what makes the flaw urgent.',
        'RiskPilot connects a public flaw to the system you rely on, then shows what to verify and what to do first.'
      ]);
      offer('tutorial', 'demo', 'workbench');
      break;
    case 'demo':
      appendTurn('RiskPilot', [
        'Try Log4Shell with a fictional customer website. The website uses a component that records what happens in the app. A flaw in that component could let an attacker run commands.',
        'The sample report shows why the risk is urgent, which facts come from public sources, and what the website owner still needs to verify.'
      ], {href:'assessment.html?demo=log4shell', label:'Open the prefilled example →'});
      offer('tutorial', 'why', 'workbench');
      break;
    case 'cve':
      appendTurn('RiskPilot', [
        'A vulnerability is a weakness in software. A CVE ID is the public tracking number for a known vulnerability, like a case number.',
        'A patch is a software update that fixes a flaw. A CVE record helps you find out which products may be affected and where to look for the vendor’s fix.'
      ]);
      offer('demo', 'tutorial', 'workbench');
      break;
    case 'workbench':
      appendTurn('RiskPilot', [
        'If you have a CVE ID from an alert or a report, enter it here or open the assessment workbench. You can add any details you know about the system.'
      ], {href:'assessment.html', label:'Open the assessment workbench →'});
      offer('cve', 'demo', 'tutorial');
      break;
    default:
      appendTurn('RiskPilot', [
        'This guided chat can explain security basics, walk you through an example, or help you look up a vulnerability by CVE ID. Pick a question below to continue.'
      ]);
      if (lesson >= 0 && lesson < lessons.length - 1) offer('next', 'why', 'demo', 'workbench');
      else offer('tutorial', 'why', 'demo', 'workbench');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = question.value.trim();
  if (!text) return;
  reply(text);
  form.reset();
  question.focus();
});

suggestions.addEventListener('click', event => {
  const button = event.target.closest('button[data-topic]');
  if (!button) return;
  reply(button.textContent, button.dataset.topic);
  question.focus();
});
