import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  POWER_UP_1_NOTE,
  POWER_UP_1_SENTENCE_COUNT,
  POWER_UP_1_UNITS,
  POWER_UP_1_UNIT_COUNT,
  POWER_UP_1_WORD_COUNT,
  getPowerUp1Unit,
} from '../content/powerUp1Packs.ts';
import { DEFAULT_KET_PACK_SIZE, applyDefaultKetPack } from './wordImport.ts';
import { parseSentenceList } from './parseSentenceList.ts';
import { parseWordList } from './parseWordList.ts';
import { DEFAULT_PROFILE_ID } from './profile.ts';
import { emptyQuestState } from './quest.ts';
import { applyPowerUp1UnitImport } from './powerUp1.ts';
import { applySentenceListImport } from './sentenceImport.ts';
import type { QuestState, Word } from '../types/models.ts';

function word(id: string, en: string, extra?: Partial<Word>): Word {
  return {
    id,
    en,
    zh: en,
    source: 'parent',
    createdAt: 't',
    profileId: DEFAULT_PROFILE_ID,
    ...extra,
  };
}

function ids(prefix: string) {
  let n = 0;
  return (kind: string) => `${kind}_${prefix}_${(n += 1)}`;
}

describe('Power Up 1 family unit packs', () => {
  it('ships 11 units and 186 unique words matching the raw files', () => {
    assert.equal(POWER_UP_1_UNITS.length, POWER_UP_1_UNIT_COUNT);
    assert.equal(POWER_UP_1_WORD_COUNT, 186);
    assert.equal(POWER_UP_1_SENTENCE_COUNT, 186);
    assert.match(POWER_UP_1_NOTE, /不主张剑桥授权/);
    assert.match(POWER_UP_1_NOTE, /EnglishStudy/);

    const seen = new Set<string>();
    let words = 0;
    let sentences = 0;
    for (const unit of POWER_UP_1_UNITS) {
      const fromWords = readFileSync(new URL(`../content/${unit.wordsFile}`, import.meta.url), 'utf8');
      const fromSentences = readFileSync(
        new URL(`../content/${unit.sentencesFile}`, import.meta.url),
        'utf8',
      );
      assert.equal(unit.wordsText, fromWords.replace(/\r\n/g, '\n'));
      assert.equal(unit.sentencesText, fromSentences.replace(/\r\n/g, '\n'));
      const parsedWords = parseWordList(unit.wordsText);
      const parsedSentences = parseSentenceList(unit.sentencesText);
      assert.equal(parsedWords.length, unit.wordCount);
      assert.equal(parsedSentences.length, unit.wordCount);
      for (const item of parsedWords) {
        const key = item.en.toLowerCase();
        assert.equal(seen.has(key), false, `duplicate ${item.en}`);
        seen.add(key);
      }
      words += parsedWords.length;
      sentences += parsedSentences.length;
    }
    assert.equal(words, POWER_UP_1_WORD_COUNT);
    assert.equal(sentences, POWER_UP_1_SENTENCE_COUNT);
    assert.equal(getPowerUp1Unit(0)?.slug, 'hello');
    assert.equal(getPowerUp1Unit(99), undefined);
  });

  it('appends a unit without wiping the existing bank or KET progress', () => {
    const existing = [
      word('w1', 'apple', { ketPack: true }),
      word('w2', 'red', { ketPack: true, zh: '红' }),
    ];
    const quest: QuestState = {
      ...emptyQuestState(),
      packWordIds: ['w1', 'w2'],
      items: { w1: { learnedOn: '2026-01-01', step: 1, nextDue: '2026-01-02' } },
      cursor: 1,
    };
    const result = applyPowerUp1UnitImport(existing, quest, [], DEFAULT_PROFILE_ID, 0, {
      now: 't',
      createId: ids('hello'),
    });
    assert.equal(result.added, 17);
    assert.equal(result.skipped, 1);
    assert.equal(result.sentencesAdded, 18);
    assert.equal(result.sentencesSkipped, 0);
    assert.equal(existing.length, 2);
    assert.equal(result.words.length, 19);
    assert.equal(result.words.find((item) => item.id === 'w1')?.en, 'apple');
    assert.equal(result.words.find((item) => item.id === 'w2')?.zh, '红');
    assert.deepEqual(result.quest.items, quest.items);
    assert.equal(result.quest.cursor, 1);
    const packEns = result.quest.packWordIds.map(
      (id) => result.words.find((item) => item.id === id)?.en,
    );
    assert.equal(packEns[0], 'name');
    assert.ok(packEns.includes('apple'));
    assert.equal(packEns[packEns.indexOf('red')], 'red');
    assert.equal(packEns[packEns.length - 1], 'apple');
    assert.equal(result.sentences[0]?.tags?.join(','), 'power-up-1,hello');
    assert.ok(result.sentences.some((item) => item.en.startsWith('My name is Zichen')));
  });

  it('re-importing the same unit skips words and sentences and keeps the KET pack', () => {
    const first = applyPowerUp1UnitImport([], emptyQuestState(), [], DEFAULT_PROFILE_ID, 1, {
      now: 't',
      createId: ids('school1'),
    });
    const again = applyPowerUp1UnitImport(
      first.words,
      first.quest,
      first.sentences,
      DEFAULT_PROFILE_ID,
      1,
      { now: 't', createId: ids('school2') },
    );
    assert.equal(first.added, 24);
    assert.equal(again.added, 0);
    assert.equal(again.skipped, 24);
    assert.equal(again.sentencesAdded, 0);
    assert.equal(again.sentencesSkipped, 24);
    assert.equal(again.words.length, first.words.length);
    assert.deepEqual(again.quest.packWordIds, first.quest.packWordIds);
    assert.equal(again.sentences.length, first.sentences.length);
  });

  it('can skip sentence import and still prepend the unit in front of the default KET pack', () => {
    let n = 0;
    const seeded = applyDefaultKetPack([], emptyQuestState(), DEFAULT_PROFILE_ID, {
      now: 't',
      createId: (prefix) => `${prefix}_ket_${(n += 1)}`,
    });
    assert.equal(seeded.words.length, DEFAULT_KET_PACK_SIZE);
    const result = applyPowerUp1UnitImport(
      seeded.words,
      seeded.quest,
      [],
      DEFAULT_PROFILE_ID,
      3,
      { now: 't', createId: ids('farm'), includeSentences: false },
    );
    assert.ok(result.added > 0);
    assert.ok(result.skipped > 0);
    assert.equal(result.sentencesAdded, 0);
    assert.equal(result.sentences.length, 0);
    assert.equal(result.words.length, seeded.words.length + result.added);
    assert.equal(result.quest.packWordIds.length, seeded.quest.packWordIds.length + result.added);
    assert.equal(
      result.words.find((item) => item.id === result.quest.packWordIds[0])?.en,
      parseWordList(getPowerUp1Unit(3)?.wordsText ?? '')[0]?.en,
    );
    assert.equal(
      result.words.find((item) => item.id === result.quest.packWordIds.at(-1))?.en,
      'zero',
    );
  });
});

describe('sentence list import helper', () => {
  it('appends unique sentences and tags them', () => {
    const existing = [
      {
        id: 's1',
        en: 'I have one apple.',
        createdAt: 't',
        profileId: DEFAULT_PROFILE_ID,
      },
    ];
    const result = applySentenceListImport(
      existing,
      [word('w1', 'apple')],
      DEFAULT_PROFILE_ID,
      'I have one apple.|我有一个苹果\nThe sun is yellow.|太阳是黄色的',
      { now: 't', createId: ids('s'), tags: ['power-up-1', 'hello'] },
    );
    assert.equal(result.added, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.sentences.length, 2);
    assert.deepEqual(result.sentences[0]?.tags, ['power-up-1', 'hello']);
    assert.deepEqual(result.sentences[0]?.wordIds, undefined);
    assert.equal(result.sentences[1]?.id, 's1');
  });
});
