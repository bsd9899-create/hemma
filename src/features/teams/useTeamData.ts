import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { progressRepository } from '@/src/data/repositories/progressRepository';
import {
  teamsRepository,
  type Challenge,
  type Team,
  type TeamLeaderboardRow,
  type TeamRosterRow,
} from '@/src/data/repositories/teamsRepository';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export type ChallengeWithProgress = Challenge & { myProgressPercent: number };

export type TeamData = {
  team: Team;
  pulsePercent: number | null;
  roster: TeamRosterRow[];
  leaderboard: TeamLeaderboardRow[];
  myRank: number | null;
  challenges: ChallengeWithProgress[];
};

export function useTeamData(userId: string | undefined) {
  const { t } = useTranslation();
  const [data, setData] = useState<TeamData | null>(null);
  /** null = لم يُحسم بعد هل عنده فريق، false = تأكّدنا أنه بلا فريق. */
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return;
    if (!options?.silent) setIsLoading(true);
    setError(null);
    try {
      const team = await teamsRepository.getMyTeam(userId);
      if (!team) {
        setHasTeam(false);
        setData(null);
        return;
      }
      setHasTeam(true);

      const [pulsePercent, roster, leaderboard, challenges] = await Promise.all([
        teamsRepository.getPulseToday(team.id),
        teamsRepository.getRoster(team.id),
        teamsRepository.getLeaderboard(team.id),
        teamsRepository.getChallenges(team.id),
      ]);

      const challengesWithProgress = await Promise.all(
        challenges.map(async (challenge) => {
          const myProgressPercent = await progressRepository.getAverageCompletionInRange(
            userId,
            challenge.start_date,
            challenge.end_date
          );
          await teamsRepository.upsertMyChallengeProgress(challenge.id, userId, myProgressPercent);
          return { ...challenge, myProgressPercent };
        })
      );

      const myRankIndex = leaderboard.findIndex((row) => row.user_id === userId);

      setData({
        team,
        pulsePercent,
        roster,
        leaderboard,
        myRank: myRankIndex >= 0 ? myRankIndex + 1 : null,
        challenges: challengesWithProgress,
      });
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('teams.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  // يُعاد الجلب عند كل عودة للشاشة، وليس عند التركيب فقط: المستخدم قد
  // يسجّل ماءً/وزنًا أو ينضم لفريق من شاشة أخرى، وبدون هذا تبقى الشاشة
  // تعرض أرقامًا قديمة حتى يسحب لتحديثها يدويًا. أول جلب يعرض حالة
  // التحميل، والعودات التالية تُحدِّث بصمت حتى لا تومض الشاشة.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load({ silent: hasLoadedOnceRef.current });
      hasLoadedOnceRef.current = true;
    }, [load])
  );

  return { data, hasTeam, isLoading, error, refetch: load };
}
