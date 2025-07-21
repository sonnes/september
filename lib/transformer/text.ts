import Tagger from 'wink-pos-tagger';

// See: https://winkjs.org/wink-pos-tagger/

const FORMAT_ERROR = 'Invalid file format.';

const tagger = new Tagger();

export const partsOfSpeech = [
  'CC',
  'CD',
  'DT',
  'EX',
  'FW',
  'IN',
  'JJ',
  'JJR',
  'JJS',
  'LS',
  'MD',
  'NN',
  'NNS',
  'NNP',
  'NNPS',
  'PDT',
  'POS',
  'PRP',
  'PRP$',
  'RB',
  'RBR',
  'RBS',
  'RP',
  'SYM',
  'TO',
  'UH',
  'VB',
  'VBD',
  'VBG',
  'VBN',
  'VBP',
  'VBZ',
  'WDT',
  'WP',
  'WP$',
  'WRB',
];

export const suffixes = [
  'ack',
  'ail',
  'ain',
  'ake',
  'ale',
  'ame',
  'an',
  'ank',
  'ap',
  'are',
  'ash',
  'at',
  'ate',
  'aw',
  'ay',
  'eat',
  'ell',
  'est',
  'ice',
  'ick',
  'ide',
  'ight',
  'ill',
  'in',
  'ine',
  'ing',
  'ink',
  'ip',
  'it',
  'ock',
  'oke',
  'op',
  'ore',
  'ot',
  'ug',
  'ump',
  'unk',
];

export const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&',
  vowels = 'aeiou',
  y = 'y',
  x = 'x',
  w = 'w',
  k = 'k',
  j = 'j';

export const getPartsOfSpeech = (text: string) => tagger.tagSentence(text);

export const isLowerCase = (letter: string) =>
  letter === letter.toLowerCase() && letter !== letter.toUpperCase();

export const tokenize = (input: string) =>
  input
    .trim()
    .replace(/[\p{P}$+<=>^`(\\\n)|~]/gu, ' ')
    .split(' ');
