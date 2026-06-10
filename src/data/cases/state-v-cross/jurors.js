// The voir dire pool: 18 candidates. Player strikes 3, the State strikes 3
// (highest defenseLean among those remaining), first 12 left are seated.
//
// receptivity: multipliers on fact channels (police, forensics, lay, docs, emotion).
// doubtThreshold: belief required to vote guilty on an element (BRD, varies by person).
// firmness: resistance to peer pressure in deliberation.
// priors: starting beliefs per issue. altSuspect starts high — jurors presume
// the police arrested the right man unless the defense gives them someone else.
// defenseLean: hidden; drives the AI prosecutor's strikes.

const basePriors = { identity: 0.5, timeline: 0.5, intent: 0.5, weapon: 0.5, altSuspect: 0.72 };
const P = (over = {}) => ({ ...basePriors, ...over });

export const JUROR_POOL = [
  {
    id: 'j01', name: 'Harold Voss', occupation: 'Retired transit cop', archetype: 'authority',
    quotes: ['"Twenty-six years on the job. You learn to read people."', '"If police arrested him, they had a reason. That\'s just math."'],
    receptivity: { police: 1.35, forensics: 1.0, lay: 0.9, docs: 0.95, emotion: 0.7 },
    doubtThreshold: 0.78, firmness: 0.8, priors: P({ identity: 0.56, altSuspect: 0.8 }), defenseLean: 0.1,
  },
  {
    id: 'j02', name: 'Mei-Lin Han', occupation: 'Software QA engineer', archetype: 'analyst',
    quotes: ['"I find bugs for a living. I assume everything is broken until proven otherwise."', '"Eyewitnesses? I\'d want to see the data."'],
    receptivity: { police: 0.85, forensics: 1.3, lay: 0.75, docs: 1.35, emotion: 0.6 },
    doubtThreshold: 0.86, firmness: 0.85, priors: P({ altSuspect: 0.68 }), defenseLean: 0.75,
  },
  {
    id: 'j03', name: 'Dorothy Plum', occupation: 'Church organist', archetype: 'empath',
    quotes: ['"You can hear it in a person\'s voice, whether they\'re telling the truth."', '"I just feel terrible for everyone involved."'],
    receptivity: { police: 1.0, forensics: 0.8, lay: 1.2, docs: 0.8, emotion: 1.45 },
    doubtThreshold: 0.84, firmness: 0.4, priors: P(), defenseLean: 0.5,
  },
  {
    id: 'j04', name: 'Ray Delgado', occupation: 'Line cook', archetype: 'follower',
    quotes: ['"I don\'t know, whatever makes sense I guess."', '"I mostly just want this to be over, honestly."'],
    receptivity: { police: 1.0, forensics: 1.0, lay: 1.05, docs: 0.9, emotion: 1.1 },
    doubtThreshold: 0.82, firmness: 0.25, priors: P(), defenseLean: 0.45,
  },
  {
    id: 'j05', name: 'Imogen Clarke', occupation: 'High school chemistry teacher', archetype: 'analyst',
    quotes: ['"Show me the mechanism. Stories are easy; evidence is hard."', '"My students will tell you: I take nothing on faith."'],
    receptivity: { police: 0.9, forensics: 1.35, lay: 0.8, docs: 1.25, emotion: 0.65 },
    doubtThreshold: 0.85, firmness: 0.75, priors: P({ altSuspect: 0.7 }), defenseLean: 0.7,
  },
  {
    id: 'j06', name: 'Walt Brubaker', occupation: 'Hardware store owner', archetype: 'authority',
    quotes: ['"I back the blue, I\'ll say that up front."', '"Somebody\'s dead. Somebody did it. Usually it\'s who they say it is."'],
    receptivity: { police: 1.4, forensics: 0.95, lay: 1.0, docs: 0.85, emotion: 0.8 },
    doubtThreshold: 0.79, firmness: 0.7, priors: P({ identity: 0.55, altSuspect: 0.82 }), defenseLean: 0.05,
  },
  {
    id: 'j07', name: 'Priya Raman', occupation: 'ER nurse', archetype: 'skeptic',
    quotes: ['"I\'ve seen detectives get it wrong in my trauma bay more than once."', '"Everyone\'s certain until they\'re not. Certainty is cheap."'],
    receptivity: { police: 0.65, forensics: 1.2, lay: 0.95, docs: 1.1, emotion: 0.95 },
    doubtThreshold: 0.86, firmness: 0.8, priors: P({ identity: 0.46, altSuspect: 0.66 }), defenseLean: 0.85,
  },
  {
    id: 'j08', name: 'Gene Kowalski', occupation: 'Insurance adjuster', archetype: 'analyst',
    quotes: ['"Fraud taught me one thing: plausible isn\'t proven."', '"I read the fine print. All of it."'],
    receptivity: { police: 0.95, forensics: 1.15, lay: 0.85, docs: 1.3, emotion: 0.7 },
    doubtThreshold: 0.84, firmness: 0.65, priors: P(), defenseLean: 0.6,
  },
  {
    id: 'j09', name: 'Tamika Boyd', occupation: 'Daycare director', archetype: 'empath',
    quotes: ['"Kids can\'t fake what their faces do. Neither can adults, mostly."', '"I believe people are good until they show me otherwise."'],
    receptivity: { police: 0.95, forensics: 0.85, lay: 1.25, docs: 0.8, emotion: 1.4 },
    doubtThreshold: 0.85, firmness: 0.5, priors: P({ identity: 0.47 }), defenseLean: 0.65,
  },
  {
    id: 'j10', name: 'Stan Whitfield', occupation: 'Retired bank manager', archetype: 'authority',
    quotes: ['"Process exists for a reason. I trust the process."', '"An innocent man explains himself. He doesn\'t need a lawyer to do it."'],
    receptivity: { police: 1.25, forensics: 1.0, lay: 0.95, docs: 1.05, emotion: 0.7 },
    doubtThreshold: 0.8, firmness: 0.75, priors: P({ altSuspect: 0.8 }), defenseLean: 0.15,
  },
  {
    id: 'j11', name: 'Carmen Ibarra', occupation: 'Freelance journalist', archetype: 'skeptic',
    quotes: ['"My whole job is checking what officials tell me. It rarely survives checking."', '"One camera timestamp and one shaky witness? I\'d want more."'],
    receptivity: { police: 0.6, forensics: 1.1, lay: 1.0, docs: 1.2, emotion: 0.9 },
    doubtThreshold: 0.87, firmness: 0.85, priors: P({ identity: 0.45, altSuspect: 0.62 }), defenseLean: 0.9,
  },
  {
    id: 'j12', name: 'Bud Hutchins', occupation: 'Long-haul trucker', archetype: 'follower',
    quotes: ['"I\'ll listen to everybody and go with the room."', '"No strong feelings either way, tell you the truth."'],
    receptivity: { police: 1.05, forensics: 0.95, lay: 1.1, docs: 0.85, emotion: 1.0 },
    doubtThreshold: 0.81, firmness: 0.3, priors: P(), defenseLean: 0.4,
  },
  {
    id: 'j13', name: 'Alice Ferraro', occupation: 'Pharmacist', archetype: 'analyst',
    quotes: ['"Dosage errors kill. I double-check everything, twice."', '"I\'d hold the State to its burden. That\'s the instruction, isn\'t it?"'],
    receptivity: { police: 0.95, forensics: 1.25, lay: 0.85, docs: 1.2, emotion: 0.75 },
    doubtThreshold: 0.84, firmness: 0.7, priors: P(), defenseLean: 0.65,
  },
  {
    id: 'j14', name: 'Marcus Tilley', occupation: 'Youth pastor', archetype: 'empath',
    quotes: ['"Every man deserves to be heard. Every single one."', '"But a grieving family deserves an answer, too."'],
    receptivity: { police: 0.9, forensics: 0.85, lay: 1.2, docs: 0.85, emotion: 1.35 },
    doubtThreshold: 0.83, firmness: 0.45, priors: P(), defenseLean: 0.55,
  },
  {
    id: 'j15', name: 'Verna Sloane', occupation: 'Court stenographer (retired)', archetype: 'authority',
    quotes: ['"Thirty years transcribing trials. The defendant usually did it."', '"Defense lawyers all sound the same after a while."'],
    receptivity: { police: 1.2, forensics: 1.05, lay: 1.0, docs: 1.1, emotion: 0.75 },
    doubtThreshold: 0.78, firmness: 0.85, priors: P({ identity: 0.58, intent: 0.55, altSuspect: 0.84 }), defenseLean: 0.0,
  },
  {
    id: 'j16', name: 'Theo Lindqvist', occupation: 'Grad student, statistics', archetype: 'skeptic',
    quotes: ['"Eyewitness identification has a documented error rate. Look it up."', '"Base rates matter. Priors matter. Sorry, I get excited."'],
    receptivity: { police: 0.7, forensics: 1.3, lay: 0.7, docs: 1.3, emotion: 0.6 },
    doubtThreshold: 0.87, firmness: 0.75, priors: P({ identity: 0.44, altSuspect: 0.64 }), defenseLean: 0.85,
  },
  {
    id: 'j17', name: 'Gloria Mott', occupation: 'Florist', archetype: 'follower',
    quotes: ['"Oh, I could see it going either way, really."', '"I suppose the lawyers will tell us what matters."'],
    receptivity: { police: 1.0, forensics: 0.9, lay: 1.15, docs: 0.85, emotion: 1.2 },
    doubtThreshold: 0.83, firmness: 0.2, priors: P(), defenseLean: 0.5,
  },
  {
    id: 'j18', name: 'Dexter Pugh', occupation: 'Gym owner, ex-Marine', archetype: 'authority',
    quotes: ['"Discipline. Accountability. A man owns what he does."', '"If he didn\'t do it, why\'d he lie about where he was?"'],
    receptivity: { police: 1.3, forensics: 1.0, lay: 0.95, docs: 0.9, emotion: 0.75 },
    doubtThreshold: 0.8, firmness: 0.8, priors: P({ timeline: 0.55, altSuspect: 0.8 }), defenseLean: 0.1,
  },
];
