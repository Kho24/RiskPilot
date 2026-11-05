import {findScenario, scenarios} from './scenarios.js';
import {practiceCases} from './practice.js';
import {demos, demoLabel} from './demos.js';

const conversation = document.getElementById('conversation');
const suggestions = document.getElementById('suggestions');
const form = document.getElementById('chat-form');
const question = document.getElementById('question');
let lesson = -1;
let activeScenario;
let activePractice;
let previousPractice;

const topics = {
  tutorial: 'Start the 2-minute walkthrough',
  why: 'Why should I care?',
  demo: 'Try an example',
  practice: 'Surprise me with a scenario',
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
  for (const item of Array.isArray(link) ? link : link ? [link] : []) {
    const anchor = document.createElement('a');
    anchor.href = item.href;
    anchor.textContent = item.label;
    bubble.append(anchor);
  }
  turn.append(label, bubble);
  conversation.append(turn);
  conversation.scrollTop = conversation.scrollHeight;
}

function offer(...options) {
  suggestions.replaceChildren(...options.map(option => {
    const [topic, label] = Array.isArray(option) ? option : [option, topics[option]];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion';
    button.dataset.topic = topic;
    button.textContent = label;
    return button;
  }));
}

function askScenario(key, text) {
  const scenario = scenarios[key];
  const answer = scenario.answers.find(item => item.inMessage?.(text));
  if (answer) {
    finishScenario(scenario, answer);
    return;
  }
  activeScenario = scenario;
  appendTurn('RiskPilot', scenario.opening, scenario.source);
  offer(...scenario.answers.map((item, index) => ['answer-' + index, item.label]), 'practice');
}

function finishScenario(scenario, answer) {
  activeScenario = undefined;
  appendTurn('RiskPilot', [answer.reply], scenario.source);
  offer('practice', 'tutorial', 'workbench');
}

function startPractice() {
  activeScenario = undefined;
  const keys = Object.keys(practiceCases).filter(key => key !== previousPractice);
  const key = keys[Math.floor(Math.random() * keys.length)];
  previousPractice = key;
  const exercise = practiceCases[key];
  activePractice = {exercise, choices: exercise.choices, source: scenarios[key].source};
  appendTurn('RiskPilot', ['Practice · 1 of 2', exercise.setup]);
  offerPracticeChoices();
}

function offerPracticeChoices() {
  offer(...activePractice.choices.map((choice, index) => ['practice-' + index, choice.label]), ['exit-practice', 'End practice']);
}

function answerPractice(text, topic) {
  const {exercise, choices, source} = activePractice;
  const numbered = text.match(/^(?:option )?([12])[.!]?$/i);
  const index = topic?.startsWith('practice-') ? Number(topic.slice(9))
    : numbered ? Number(numbered[1]) - 1 : -1;
  const exact = choices.find(choice => choice.label.toLowerCase() === text.toLowerCase());
  const matches = choices.filter(choice => choice.matches.test(text));
  const choice = choices[index] || exact || (matches.length === 1 ? matches[0] : undefined);
  if (!choice) {
    appendTurn('RiskPilot', ['I’m not sure which action you mean. Pick a reply below, or type a short action in your own words.']);
    return;
  }
  if (choice.next) {
    activePractice.choices = exercise.followUp;
    appendTurn('RiskPilot', [choice.feedback, 'Practice · 2 of 2', choice.next]);
    offerPracticeChoices();
    return;
  }
  activePractice = undefined;
  appendTurn('RiskPilot', [choice.feedback, exercise.takeaway], source);
  offer('practice', 'tutorial', 'workbench');
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
    activeScenario = undefined;
    activePractice = undefined;
    appendTurn('RiskPilot', [
      'I found ' + cve + ' in your message. Open the assessment to look up the public record and see what to verify for your system.',
      'If you don’t know a detail about the system, leave it as Unknown.'
    ], {href:'assessment.html?cve=' + encodeURIComponent(cve), label:'Assess ' + cve + ' →'});
    offer('cve', 'demo', 'tutorial');
    return;
  }
  if (topic === 'practice' || /\b(?:random|practice) scenario\b|\bsurprise me\b/i.test(text)) {
    startPractice();
    return;
  }
  if (activePractice && (topic === 'exit-practice' || (!topic && /^(?:exit|stop|quit)(?: practice)?[.!]?$/i.test(text)))) {
    activePractice = undefined;
    appendTurn('RiskPilot', ['Practice ended. Tell me what happened, or try another scenario whenever you’re ready.']);
    offer('practice', 'tutorial', 'workbench');
    return;
  }
  if (activePractice && (!topic || topic.startsWith('practice-'))) {
    answerPractice(text, topic);
    return;
  }
  if (activeScenario && (!topic || topic.startsWith('answer-'))) {
    const scenario = activeScenario;
    const choice = topic?.startsWith('answer-') ? scenario.answers[Number(topic.slice(7))]
      : scenario.answers.find(item => item.matches(text));
    if (choice) {
      finishScenario(scenario, choice);
      return;
    }
  }
  const scenarioKey = topic ? undefined : findScenario(text);
  if (scenarioKey) {
    askScenario(scenarioKey, text);
    return;
  }
  if (!topic) {
    if (/^(next|continue|next step)[.!]?$/i.test(text) && lesson >= 0 && lesson < lessons.length - 1) topic = 'next';
    else if (/\b(tutorial|walkthrough|beginner|start|basics)\b/i.test(text)) topic = 'tutorial';
    else if (/\b(example|demo|log4shell)\b/i.test(text)) topic = 'demo';
    else if (/\b(cve|vulnerability|vulnerabilities|patch)\b/i.test(text)) topic = 'cve';
    else if (/^why should i care|^why is (?:this|cybersecurity|security) important|^what is (?:cybersecurity|security)/i.test(text)) topic = 'why';
    else if (/\b(assess|check|workbench|scan)\b/i.test(text)) topic = 'workbench';
  }
  if (topic) {
    activeScenario = undefined;
    activePractice = undefined;
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
        'Pick a prefilled example. The number measures the software flaw itself. The report also shows the priority for the example system.',
        'Try Sweet32 to see how changing who can reach a system or what it contains can raise its priority.'
      ], Object.entries(demos).map(([key, demo]) => ({
        href:'assessment.html?demo=' + key, label:demoLabel(demo) + ' →'
      })));
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
      if (activeScenario) {
        appendTurn('RiskPilot', ['Let’s narrow it down. ' + activeScenario.opening.at(-1)]);
      } else {
        appendTurn('RiskPilot', [
          'Tell me what happened and what might be affected. Was it a missing card, a suspicious link, or an account someone may have accessed?',
          'A useful starting point is what someone might have access to, whether you’ve seen any misuse, and what you’ve already done to limit access.'
        ]);
        if (lesson >= 0 && lesson < lessons.length - 1) offer('next', 'practice', 'workbench');
        else offer('practice', 'tutorial', 'workbench');
      }
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
