import test from 'node:test';
import assert from 'node:assert/strict';
import {guidanceSections, appendGuidance} from '../dist/chat-format.js';
import {Element} from './workbench.mjs';

test('formatting preserves every character and its order, including safety caveats', () => {
  for (const answer of [
    'This may be phishing.\n\nDo not click the email link. Open the official app.\n\nAfterward, check account activity.',
    'Use a unique password. Enable MFA. After you change it, verify account access.',
    'Risk Analyst\nUnknown applicability.\nRemediation\nConfirm with the owner.\nReviewer\nNo inspection was performed.',
    'No separate actions or follow-up were specified.',
    'If you did not request the reset, do not follow the email link. Contact the official provider.',
    '',
    'Before any change, confirm the vendor guidance.\n1. Avoid untrusted links.\n2. Contact support.\nLimitations: I cannot inspect your account.'
  ]) {
    const sections = guidanceSections(answer);
    assert.deepEqual(sections.map(item => item.title), ['Risk Analyst', 'Remediation', 'Reviewer']);
    assert.equal(sections.map(item => item.text).join(''), answer);
  }
});

test('recognizable action and follow-up blocks receive the corresponding reading headings', () => {
  const sections = guidanceSections('This may be phishing.\n\nDo not click the link.\n\nAfterward, review account activity.');
  assert.match(sections[0].text, /may be phishing/);
  assert.match(sections[1].text, /Do not click/);
  assert.match(sections[2].text, /Afterward/);
});

test('model text is rendered literally; headings do not claim separate executions', () => {
  const answer = '<img src="https://collector.example.invalid/" onerror="alert(1)">';
  const bubble = new Element('div');
  appendGuidance(bubble, answer, {createElement: tag => new Element(tag)});
  assert.match(bubble.children[0].textContent, /not separate agent runs/);
  const modelParagraphs = bubble.children.slice(1).flatMap(section => section.children.filter(node => node.dataset.modelText));
  assert.equal(modelParagraphs.map(node => node.textContent).join(''), answer);
  assert.ok(bubble.innerHTML.includes('&lt;img'));
  assert.ok(!bubble.innerHTML.includes('<img'));
});
