import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen, SearchField } from '@/components/ui';
import { glossSuggestions, PROOFREAD_STARTER } from '@/content/proofreadStarterPack';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { profileIdOf } from '@/lib/profile';
import { todayKey } from '@/lib/util';
import { filterWords } from '@/lib/wordsView';
import {
  editableWeeklySelection,
  legacyDailyCopy,
  previewGlossCorrections,
  weeklyEffectCopy,
} from '@/lib/weekly';

export default function WeeklyWordsScreen() {
  const {
    state,
    activeProfileId,
    progressFor,
    saveWeeklySelection,
    setWeeklyWordReadiness,
    createWordGroup,
    addSelectedWordsToGroup,
    removeWordGroup,
    importProofreadStarter,
    applyWordGlossCorrections,
  } = useDesk();
  const [query, setQuery] = useState('');
  const [knownOnly, setKnownOnly] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [pickedFixes, setPickedFixes] = useState<Record<string, boolean>>({});
  const [packNote, setPackNote] = useState('');

  const date = todayKey();
  const lesson = state.dailyByProfile[activeProfileId] ?? null;
  const plan = state.weeklyByProfile[activeProfileId];
  const selection = editableWeeklySelection(plan, activeProfileId);
  const selected = new Set(selection.wordIds);
  const groups = state.contentGroups.filter((group) => profileIdOf(group) === activeProfileId);
  const effect = weeklyEffectCopy(lesson, activeProfileId, date);
  const legacy = legacyDailyCopy(state.legacyDaily);
  const suggestions = useMemo(() => glossSuggestions(), []);
  const fixes = useMemo(
    () => previewGlossCorrections(state.words, activeProfileId, suggestions),
    [state.words, activeProfileId, suggestions],
  );
  const matches = useMemo(() => {
    const rows = filterWords(state.words, query).filter((word) => !selected.has(word.id));
    const narrowed = knownOnly ? rows.filter((word) => progressFor(word.id).vocabKnown) : rows;
    return narrowed.slice(0, 40);
  }, [state.words, query, knownOnly, selected, progressFor]);

  const writeSelection = (wordIds: string[], enabled = selection.enabled) => {
    const readiness = { ...selection.readiness };
    for (const id of wordIds) if (!readiness[id]) readiness[id] = 'familiarize';
    for (const id of Object.keys(readiness)) if (!wordIds.includes(id)) delete readiness[id];
    saveWeeklySelection({ enabled, wordIds, readiness });
  };

  const toggleWord = (wordId: string) => {
    const wordIds = selected.has(wordId)
      ? selection.wordIds.filter((id) => id !== wordId)
      : [...selection.wordIds, wordId];
    writeSelection(wordIds);
  };

  return (
    <Screen
      title="本周选词"
      subtitle="勾选这一周要练的词。建议 15 到 20 个，更少也可以。清单不会在周一自动清空，也不会替孩子标成已经会拼。"
      back
    >
      <Card style={styles.block}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>按本周清单安排今日卡</Text>
            <Text style={styles.meta}>打开后，下一张今日卡只从勾选的词里抽，仍是原来的背词和默写。关掉或改清单不会删除单词、录音或学习记录。</Text>
          </View>
          <Switch
            accessibilityLabel="按本周清单安排今日卡"
            value={selection.enabled}
            onValueChange={(enabled) => writeSelection(selection.wordIds, enabled)}
            trackColor={{ true: Colors.success }}
          />
        </View>
        <Text style={styles.meta}>{effect}</Text>
        <Text style={styles.meta}>
          已选 {selection.wordIds.length} 个。
          {selection.wordIds.length > 0 && selection.wordIds.length < 15 ? ' 比建议少也可以。' : ''}
          {selection.wordIds.length > 20 ? ' 比建议多，今天的卡仍最多抽 10 个。' : ''}
        </Text>
        {selection.enabled && selection.wordIds.length === 0 ? (
          <Text style={styles.warn}>清单是空的。今日卡不会从整份词库补词，也不会显示成已经完成。</Text>
        ) : null}
      </Card>

      {legacy ? (
        <Card style={styles.block}>
          <Text style={styles.label}>旧今日卡</Text>
          <Text style={styles.meta}>{legacy}</Text>
        </Card>
      ) : null}

      <Text style={styles.section}>已选的词</Text>
      {selection.wordIds.length === 0 ? <Text style={styles.meta}>还没有勾选。下面可以搜索词表。</Text> : null}
      {selection.wordIds.map((wordId) => {
        const word = state.words.find((item) => item.id === wordId);
        const readiness = selection.readiness[wordId] ?? 'familiarize';
        return (
          <Card key={wordId} style={styles.block}>
            <Text style={styles.label}>{word ? `${word.en} · ${word.zh}` : '这个词已经不在词表里'}</Text>
            <View style={styles.wrap}>
              <KidButton
                compact
                label="会读、懂意思，可以练拼写"
                variant={readiness === 'ready-to-spell' ? 'primary' : 'secondary'}
                onPress={() => setWeeklyWordReadiness(wordId, 'ready-to-spell')}
              />
              <KidButton
                compact
                label="先熟悉"
                variant={readiness === 'familiarize' ? 'primary' : 'secondary'}
                onPress={() => setWeeklyWordReadiness(wordId, 'familiarize')}
              />
              <KidButton compact label="移出本周" variant="ghost" onPress={() => toggleWord(wordId)} />
            </View>
          </Card>
        );
      })}

      <Text style={styles.section}>从词表里加</Text>
      <SearchField value={query} onChangeText={setQuery} placeholder="搜英文或中文" />
      <View style={styles.row}>
        <Text style={styles.meta}>只看以前标过「认识」的词。这只是筛选，不会自动放进本周。</Text>
        <Switch
          accessibilityLabel="只看标过认识的词"
          value={knownOnly}
          onValueChange={setKnownOnly}
          trackColor={{ true: Colors.success }}
        />
      </View>
      {matches.map((word) => (
        <KidButton
          key={word.id}
          compact
          variant="secondary"
          label={`加入 ${word.en} · ${word.zh}`}
          onPress={() => toggleWord(word.id)}
          style={styles.addBtn}
        />
      ))}
      {matches.length === 0 ? <Text style={styles.meta}>没有更多可加入的词。</Text> : null}

      <Text style={styles.section}>内容分组</Text>
      <Text style={styles.meta}>分组只是家长自己的归类，不会自动当成某册教材。一个词可以放进多个分组，仍用这一份单词和录音。</Text>
      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder="例如：本周拼写"
        style={styles.input}
      />
      <KidButton
        label="新建分组"
        variant="secondary"
        onPress={() => {
          createWordGroup(groupName);
          setGroupName('');
        }}
      />
      {groups.map((group) => (
        <Card key={group.id} style={styles.block}>
          <Text style={styles.label}>{group.name}</Text>
          <Text style={styles.meta}>
            {group.wordIds.length} 个词
            {group.sources.length ? ` · ${group.sources.map((source) => source.label).join('、')}` : ''}
          </Text>
          <View style={styles.wrap}>
            <KidButton
              compact
              label="把已选词放进这组"
              variant="secondary"
              onPress={() => addSelectedWordsToGroup(group.id, selection.wordIds)}
            />
            <KidButton compact label="删除分组" variant="ghost" onPress={() => removeWordGroup(group.id)} />
          </View>
        </Card>
      ))}

      <Text style={styles.section}>校对首包</Text>
      <Text style={styles.meta}>
        20 个已经逐条核对的词，来自家庭 PDF，并用剑桥词典改过释义。加入分组不会自动变成今天的任务，也不会覆盖家长改过的释义。
      </Text>
      {PROOFREAD_STARTER.map((entry) => (
        <Text key={entry.en} style={styles.meta}>{entry.en} · {entry.zh}</Text>
      ))}
      <KidButton
        label="加入校对首包分组"
        onPress={() => {
          const result = importProofreadStarter();
          setPackNote(result.added ? `新加了 ${result.added} 个词，关联了 ${result.linked} 个已有词。` : `没有新词。已有 ${result.linked} 个词仍用原来的记录。`);
        }}
      />
      {packNote ? <Text style={styles.meta}>{packNote}</Text> : null}

      <Text style={styles.section}>词义修正</Text>
      <Text style={styles.meta}>先看旧释义和建议释义。只有勾选并按下应用的才会改。词的编号、录音和学习记录都保留。再导入一次也不会覆盖没选的修改。</Text>
      {fixes.length === 0 ? <Text style={styles.meta}>当前孩子的词表里没有待确认的修正。</Text> : null}
      {fixes.map((fix) => {
        const key = `${fix.wordId}:${fix.field}`;
        return (
          <Card key={key} style={styles.block}>
            <Text style={styles.label}>{fix.en}</Text>
            <Text style={styles.meta}>现在：{fix.current}</Text>
            <Text style={styles.meta}>建议：{fix.suggested}</Text>
            <Text style={styles.meta}>{fix.reason}</Text>
            <View style={styles.row}>
              <Text style={styles.meta}>采用这条建议</Text>
              <Switch
                accessibilityLabel={`采用 ${fix.en} 的建议释义`}
                value={Boolean(pickedFixes[key])}
                onValueChange={(on) => setPickedFixes((prev) => ({ ...prev, [key]: on }))}
                trackColor={{ true: Colors.success }}
              />
            </View>
          </Card>
        );
      })}
      {fixes.length > 0 ? (
        <KidButton
          label="应用勾选的修正"
          onPress={() => {
            const picks = fixes
              .filter((fix) => pickedFixes[`${fix.wordId}:${fix.field}`])
              .map((fix) => ({ wordId: fix.wordId, suggested: fix.suggested }));
            applyWordGlossCorrections(picks);
            setPickedFixes({});
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Space.md, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, marginBottom: Space.sm },
  wrap: { gap: 8 },
  flex: { flex: 1 },
  label: { color: Colors.ink, fontSize: 18, fontWeight: '800' },
  meta: { color: Colors.muted, fontSize: 15, lineHeight: 22 },
  warn: { color: Colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  section: { color: Colors.ink, fontSize: 20, fontWeight: '800', marginTop: Space.lg, marginBottom: Space.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    marginBottom: Space.sm,
    backgroundColor: Colors.paper,
  },
  addBtn: { marginBottom: 8 },
});
