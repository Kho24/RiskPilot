// Presentation only. Slice the already validated answer at recognizable section
// boundaries; never generate advice, reorder it, interpret HTML or call a tool.
export function guidanceSections(text) {
  const boundary = '(?:^|\\n[ \\t]*|[.!?][ \\t]+)';
  const prefix = '(?:#{1,4}[ \\t]+)?(?:\\*\\*)?(?:\\d+[.)][ \\t]+)?';
  const action = new RegExp(boundary + '(' + prefix
    + '(?:Remediation\\b|Recommended (?:actions|steps)\\b|What to do\\b|Next steps\\b'
    + '|(?:Do not|Avoid|Contact|Change|Enable|Disable|Open|Visit|Use|Never click|Disconnect|Report)\\b))', 'i');
  const followUp = new RegExp(boundary + '(' + prefix
    + '(?:Reviewer\\b|Follow[- ]up\\b|Afterward\\b|Afterwards\\b|After (?:you|the change)\\b'
    + '|Once you have\\b|Limitations\\b|Uncertainty\\b))', 'i');
  const actionMatch = action.exec(text);
  const actionAt = actionMatch ? actionMatch.index + actionMatch[0].length - actionMatch[1].length : null;
  const reviewFrom = actionAt ?? 0;
  const reviewMatch = followUp.exec(text.slice(reviewFrom));
  const reviewAt = reviewMatch ? reviewFrom + reviewMatch.index + reviewMatch[0].length - reviewMatch[1].length : text.length;
  const riskEnd = actionAt ?? reviewAt;
  return [
    {title: 'Risk Analyst', hint: 'What appears to be happening and why it may matter.', text: text.slice(0, riskEnd)},
    {title: 'Remediation', hint: 'Practical actions for you or the responsible administrator.', text: actionAt === null ? '' : text.slice(actionAt, reviewAt)},
    {title: 'Reviewer', hint: 'Follow-up checks, uncertainty and limitations.', text: text.slice(reviewAt)}
  ];
}

export function appendGuidance(bubble, text, document) {
  const caption = document.createElement('div');
  caption.className = 'guidance-caption';
  caption.textContent = 'One Gemini advisory response, organized for reading. These headings are not separate agent runs.';
  bubble.append(caption);
  for (const item of guidanceSections(text)) {
    const section = document.createElement('section');
    section.className = 'guidance-section';
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    const hint = document.createElement('div');
    hint.className = 'guidance-hint';
    hint.textContent = item.hint;
    section.append(heading, hint);
    if (item.text) {
      const paragraph = document.createElement('p');
      paragraph.dataset.modelText = 'true';
      paragraph.textContent = item.text;
      section.append(paragraph);
    } else {
      const note = document.createElement('div');
      note.className = 'guidance-empty';
      note.textContent = 'No separate section was identified in this answer. Refer to the guidance in the other sections.';
      section.append(note);
    }
    bubble.append(section);
  }
}
