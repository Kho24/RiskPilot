export const advisoryInstruction = 'RiskPilot is advisory only. It cannot patch systems, change servers, install software, execute commands, scan networks, delete data, or modify infrastructure. Never claim that RiskPilot or you performed, completed, or can perform those actions. Recommend steps for a human owner instead.';

export const advisoryCorrection = 'RiskPilot provides advisory guidance only. It cannot patch systems, change servers, install software, execute commands, scan networks, delete data, or modify infrastructure. Review recommended steps with your system owner.';

const completedActions = 'patched|changed|installed|executed|scanned|deleted|modified|updated|removed|upgraded|restarted|deployed|fixed|remediated|hardened';
const proposedActions = 'patch|change|install|execute|scan|delete|modify|update|remove|upgrade|restart|deploy|fix|remediate|harden';
const ongoingActions = 'patching|changing|installing|executing|scanning|deleting|modifying|updating|removing|upgrading|restarting|deploying|fixing|remediating|hardening';
const actor = '\\b(?:i|we|riskpilot|this assistant|the assistant|this agent|the agent)\\s+';
const modifiers = '(?:(?:have|has|had|already|just|successfully|now|also|personally|fully|directly)\\s+)*';
const unsupportedClaims = [
  new RegExp(actor + modifiers + '(?:' + completedActions + ')\\b', 'i'),
  new RegExp(actor + '(?:(?:am|are|is)\\s+)(?:' + ongoingActions + ')\\b', 'i'),
  new RegExp(actor + '(?:(?:can|will|shall|did)\\s+|(?:am|are|is)\\s+going\\s+to\\s+)(?:' + proposedActions + ')\\b', 'i'),
  new RegExp(actor + modifiers + '(?:completed|finished|performed)\\s+(?:(?:a|the|your)\\s+)?(?:patch(?:ing)?|software installation|command execution|network scan|data deletion|infrastructure changes)\\b', 'i'),
  /\b(?:i|we|riskpilot)\s+(?:(?:have|has|had|will|can|shall|already|just|successfully)\s+)*(?:ran|run)\s+(?:(?:a|the|your|my|our)\s+)?(?:shell|command|script|program|network|scan)\b/i,
  new RegExp('\\b(?:your|the|this|that|our)\\s+[^.!?;]{0,100}?\\b(?:has|have|had|was|were|is|are)\\s+(?:(?:been|being|now|already|successfully|fully)\\s+)*(?:' + completedActions + ')\\b', 'i'),
  new RegExp('(?:^|[.!?]\\s+)(?:done[,:—-]?\\s+)?(?:successfully\\s+)?(?:' + completedActions + ')\\b', 'i'),
  new RegExp('(?:^|[.!?]\\s+)(?:(?:the|your)\\s+)?(?:server|system|software|command|network|data|infrastructure)\\s+(?:successfully\\s+)?(?:' + completedActions + ')\\b', 'i'),
  /\b(?:patch(?:es|ing)?|software installation|command execution|(?:network )?scan|data deletion|infrastructure changes)\s+(?:(?:has|have|had|was|were|is|are|been|now|already|successfully)\s+)*(?:complete(?:d)?|applied|executed|finished|done)\b/i
];

// Conservative English-language guard. Replace the entire response rather than
// retaining a contradictory claim elsewhere in it. This is not a general fact checker.
export function advisoryText(text) {
  const normalized = text.normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\b(i|we)'ve\b/gi, '$1 have')
    .replace(/\b(i|we)'ll\b/gi, '$1 will')
    .replace(/\b(i|we)'m\b/gi, '$1 am')
    .replace(/\b(can't|cannot)\b/gi, 'cannot')
    .replace(/\b(haven't|hasn't|hadn't|didn't)\b/gi, match => match.slice(0, -3) + ' not')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ');
  return unsupportedClaims.some(pattern => pattern.test(normalized)) ? advisoryCorrection : text;
}
