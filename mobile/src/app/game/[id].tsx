import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ErrorBox, Loading, T } from '../../components/ui';
import { useCycle } from '../../context/CycleContext';
import { api, OfflineError } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { colors, radius, space } from '../../lib/theme';
import { BADGE_ICONS } from '../../lib/constants';

type Option = { key: string; label: string };
type Question = {
  id: number;
  topic: string | null;
  prompt: string;
  options: Option[] | { left: string[]; right: string[] } | null;
  hint: string | null;
  answer: unknown;
  explanation: string | null;
};
type Game = { id: number; type: 'quiz' | 'myth_fact' | 'association'; title: string; points_per_answer: number; questions: Question[] };
type Answer = { question_id: number; answer: unknown };
type Result = {
  score: { score: number; total: number; points: number };
  is_record: boolean;
  total_points: number;
  streak_days: number;
  new_badges: { name: string; icon: string }[];
  offline?: boolean;
};

function isCorrect(q: Question, given: unknown): boolean {
  if (q.answer && typeof q.answer === 'object' && given && typeof given === 'object') {
    const a = q.answer as Record<string, unknown>;
    const g = given as Record<string, unknown>;
    return Object.keys(a).length === Object.keys(g).length && Object.keys(a).every((k) => String(a[k]) === String(g[k]));
  }
  return String(q.answer) === String(given);
}

/** Partie de jeu : quiz, mythe ou réalité, association. Jouable hors ligne. */
export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: game, loading, error, reload } = useApi<Game>(`/games/${id}?offline=1`);
  const { queueGame } = useCycle();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; q: Question } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState(false);

  const questions = game?.questions ?? [];
  const q = questions[index];
  const correctCount = answers.filter((a) => isCorrect(questions.find((x) => x.id === a.question_id)!, a.answer)).length;
  const points = correctCount * (game?.points_per_answer ?? 10);

  const answer = (value: unknown) => {
    if (!q) return;
    setAnswers((cur) => [...cur, { question_id: q.id, answer: value }]);
    setFeedback({ correct: isCorrect(q, value), q });
  };

  const next = async () => {
    setFeedback(null);
    setShowHint(false);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    // Fin de partie
    setSubmitting(true);
    const payload = { answers, client_uuid: Crypto.randomUUID(), played_at: new Date().toISOString() };
    try {
      const res = await api<Result>(`/games/${game!.id}/scores`, { method: 'POST', body: payload });
      setResult(res);
    } catch (e) {
      if (e instanceof OfflineError) {
        await queueGame({ game_id: game!.id, ...payload });
        setResult({ score: { score: correctCount, total: questions.length, points }, is_record: false, total_points: 0, streak_days: 0, new_badges: [], offline: true });
      } else {
        setResult({ score: { score: correctCount, total: questions.length, points }, is_record: false, total_points: 0, streak_days: 0, new_badges: [] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setAnswers([]);
    setResult(null);
    setReview(false);
  };

  if (loading && !game) return <Loading />;
  if (error && !game) return <ErrorBox message={error} onRetry={reload} />;
  if (!game || !q) return null;

  if (result) {
    const missed = questions.filter((qq) => {
      const a = answers.find((x) => x.question_id === qq.id);
      return a && !isCorrect(qq, a.answer);
    });
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.resultHeader, { paddingTop: insets.top + space.xl }]}>
          <T size={72}>🏆</T>
          <T weight="black" size={36} color={colors.white}>
            Bravo !
          </T>
          <T size={16} color="#D9CCF5">
            Tu as obtenu
          </T>
          <View style={s.scoreBox}>
            <T weight="black" size={36}>
              ⭐ {result.score.score} / {result.score.total}
            </T>
            <T weight="extrabold" size={16}>
              +{result.score.points} pts
            </T>
          </View>
          {result.is_record && (
            <View style={s.record}>
              <T weight="black" color={colors.white}>
                👑 Nouveau record !
              </T>
            </View>
          )}
          {result.streak_days > 0 && (
            <T weight="extrabold" size={17} color={colors.white} style={{ marginTop: space.md }}>
              🔥 Série : {result.streak_days} jour{result.streak_days > 1 ? 's' : ''}
            </T>
          )}
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + space.xl }}>
          {result.offline && (
            <Card tint={colors.goldSoft}>
              <T weight="bold">📶 Mode hors ligne : ton score sera enregistré quand tu retrouveras du réseau.</T>
            </Card>
          )}
          {result.new_badges.map((b) => (
            <Card key={b.name} tint={colors.goldSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <T size={34}>{BADGE_ICONS[b.icon] ?? '🏅'}</T>
              <T weight="black">Nouveau badge : {b.name} !</T>
            </Card>
          ))}
          {missed.length > 0 && (
            <Card>
              <Pressable onPress={() => setReview(!review)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T weight="extrabold">Tes questions ratées : {missed.length} sur {questions.length}</T>
                <Ionicons name={review ? 'chevron-up' : 'chevron-down'} size={18} color={colors.purple} />
              </Pressable>
              {review &&
                missed.map((m) => (
                  <View key={m.id} style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <T weight="bold">{m.prompt}</T>
                    <T size={14} color={colors.textMuted} style={{ marginTop: 4 }}>
                      💡 {m.explanation}
                    </T>
                  </View>
                ))}
            </Card>
          )}
          <Card tint={colors.lavender} onPress={() => router.push('/learn')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <T size={28}>📖</T>
            <T weight="bold" style={{ flex: 1 }}>
              Pour aller plus loin : Mythes et réalités sur les règles
            </T>
          </Card>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Rejouer" style={{ flex: 1 }} onPress={restart} />
            <Button title="Retour aux jeux" variant="light" style={{ flex: 1 }} onPress={() => router.back()} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Quitter">
          <Ionicons name="chevron-back" size={26} color={colors.night} />
        </Pressable>
        <T weight="black" size={17} style={{ flex: 1, marginLeft: space.sm }}>
          {game.type === 'quiz' ? `Question ${index + 1} sur ${questions.length}` : `${game.title}  ${index + 1} / ${questions.length}`}
        </T>
        <T weight="black">⭐ {points} pts</T>
      </View>
      <View style={s.progress}>
        <View style={[s.progressBar, { width: `${((index + (feedback ? 1 : 0)) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xl }}>
        {feedback ? (
          <View style={{ alignItems: 'center', gap: space.md }}>
            <View style={[s.feedbackIcon, { backgroundColor: feedback.correct ? colors.green : colors.pink }]}>
              <Ionicons name={feedback.correct ? 'checkmark' : 'close'} size={54} color={colors.white} />
            </View>
            <T weight="black" size={28} color={feedback.correct ? colors.green : colors.pink}>
              {feedback.correct ? 'Bonne réponse !' : 'Pas tout à fait…'}
            </T>
            <T size={60}>{feedback.correct ? '🙌' : '🤔'}</T>
            {feedback.q.explanation && (
              <Card tint={colors.goldSoft} style={{ alignSelf: 'stretch' }}>
                <T weight="black" size={16}>
                  💡 À retenir :
                </T>
                <T size={15} style={{ marginTop: 4, lineHeight: 22 }}>
                  {feedback.q.explanation}
                </T>
              </Card>
            )}
            <Button
              title={index + 1 < questions.length ? 'Question suivante' : 'Voir mon score'}
              icon="arrow-forward"
              onPress={next}
              loading={submitting}
              style={{ alignSelf: 'stretch', marginTop: space.md }}
            />
          </View>
        ) : (
          <>
            {q.topic && (
              <View style={s.topic}>
                <T weight="bold" size={13} color={colors.purple}>
                  {q.topic}
                </T>
              </View>
            )}
            {game.type === 'quiz' && <QuizQuestion q={q} onAnswer={answer} showHint={showHint} onHint={() => setShowHint(true)} />}
            {game.type === 'myth_fact' && <MythFactQuestion q={q} onAnswer={answer} />}
            {game.type === 'association' && <AssociationQuestion key={q.id} q={q} onAnswer={answer} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function QuizQuestion({ q, onAnswer, showHint, onHint }: { q: Question; onAnswer: (v: string) => void; showHint: boolean; onHint: () => void }) {
  const options = (q.options as Option[]) ?? [];
  return (
    <View>
      <T weight="black" size={24} style={{ textAlign: 'center', marginVertical: space.lg }}>
        {q.prompt}
      </T>
      <View style={{ gap: space.sm }}>
        {options.map((o) => (
          <Pressable key={o.key} onPress={() => onAnswer(o.key)} style={({ pressed }) => [s.option, pressed && { borderColor: colors.purple }]} accessibilityRole="button">
            <View style={s.optionKey}>
              <T weight="black" color={colors.white}>
                {o.key}
              </T>
            </View>
            <T weight="bold" size={16} style={{ flex: 1 }}>
              {o.label}
            </T>
          </Pressable>
        ))}
      </View>
      {q.hint &&
        (showHint ? (
          <Card tint={colors.lavender} style={{ marginTop: space.lg }}>
            <T>💡 {q.hint}</T>
          </Card>
        ) : (
          <Button title="Indice" icon="bulb-outline" variant="light" small onPress={onHint} style={{ alignSelf: 'center', marginTop: space.lg }} />
        ))}
    </View>
  );
}

function MythFactQuestion({ q, onAnswer }: { q: Question; onAnswer: (v: string) => void }) {
  return (
    <View>
      <Card style={{ minHeight: 220, justifyContent: 'center', marginVertical: space.xl }}>
        <T weight="black" size={24} style={{ textAlign: 'center' }}>
          {q.prompt}
        </T>
      </Card>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Pressable onPress={() => onAnswer('myth')} style={[s.mfButton, { backgroundColor: colors.pink }]} accessibilityRole="button">
          <Ionicons name="close" size={34} color={colors.white} />
          <T weight="black" size={18} color={colors.white}>
            Mythe
          </T>
        </Pressable>
        <Pressable onPress={() => onAnswer('fact')} style={[s.mfButton, { backgroundColor: colors.night }]} accessibilityRole="button">
          <Ionicons name="checkmark" size={34} color={colors.white} />
          <T weight="black" size={18} color={colors.white}>
            Réalité
          </T>
        </Pressable>
      </View>
    </View>
  );
}

function AssociationQuestion({ q, onAnswer }: { q: Question; onAnswer: (v: Record<string, number>) => void }) {
  const opts = q.options as { left: string[]; right: string[] };
  // Ordre d'affichage mélangé de la colonne de droite
  const order = useMemo(() => opts.right.map((_, i) => i).sort(() => Math.random() - 0.5), [q.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useState<number | null>(null);
  const [pairs, setPairs] = useState<Record<string, number>>({});
  const pairColors = [colors.pink, colors.purple, colors.gold, colors.green, colors.red];

  const pick = (right: number) => {
    if (selected === null) return;
    const next = Object.fromEntries(Object.entries(pairs).filter(([, r]) => r !== right));
    next[String(selected)] = right;
    setPairs(next);
    setSelected(null);
  };

  const colorOfLeft = (l: number) => (pairs[String(l)] !== undefined ? pairColors[l % pairColors.length] : undefined);
  const colorOfRight = (r: number) => {
    const l = Object.entries(pairs).find(([, v]) => v === r)?.[0];
    return l !== undefined ? pairColors[Number(l) % pairColors.length] : undefined;
  };

  return (
    <View>
      <T weight="bold" style={{ textAlign: 'center', marginVertical: space.lg }}>
        🔗 {q.prompt}
      </T>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1, gap: space.sm }}>
          {opts.left.map((label, i) => (
            <Pressable
              key={i}
              onPress={() => setSelected(i)}
              style={[s.assoc, { backgroundColor: colors.pinkSoft }, selected === i && { borderColor: colors.night }, colorOfLeft(i) ? { borderColor: colorOfLeft(i) } : null]}
            >
              <T weight="bold" size={14}>
                {label}
              </T>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1, gap: space.sm }}>
          {order.map((r) => (
            <Pressable key={r} onPress={() => pick(r)} style={[s.assoc, colorOfRight(r) ? { borderColor: colorOfRight(r) } : null]}>
              <T size={14}>{opts.right[r]}</T>
            </Pressable>
          ))}
        </View>
      </View>
      <T size={13} color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.md }}>
        Touche un terme à gauche, puis sa définition à droite.
      </T>
      <Button title="Valider" variant="purple" disabled={Object.keys(pairs).length < opts.left.length} onPress={() => onAnswer(pairs)} style={{ marginTop: space.lg }} />
    </View>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', padding: space.lg },
  progress: { height: 8, backgroundColor: colors.lavender, marginHorizontal: space.lg, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: colors.pink, borderRadius: 4 },
  topic: { alignSelf: 'center', backgroundColor: colors.lavender, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginTop: space.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, borderWidth: 1.5, borderColor: colors.border },
  optionKey: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center' },
  feedbackIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginTop: space.xl },
  mfButton: { flex: 1, alignItems: 'center', paddingVertical: space.xl, borderRadius: radius.lg },
  assoc: { minHeight: 64, justifyContent: 'center', padding: space.md, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border },
  resultHeader: { backgroundColor: colors.night, alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.xl, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  scoreBox: { backgroundColor: colors.goldSoft, borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.xxl, alignItems: 'center', marginTop: space.lg },
  record: { backgroundColor: colors.purple, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 24, marginTop: space.md },
});
