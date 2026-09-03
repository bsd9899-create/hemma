import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  accountabilityRepository,
  type AccountabilityPair,
  type AccountabilityPing,
  type PingKind,
} from '@/src/data/repositories/accountabilityRepository';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export function useAccountability(userId: string | undefined) {
  const { t } = useTranslation();
  const [pair, setPair] = useState<AccountabilityPair | null>(null);
  const [pings, setPings] = useState<AccountabilityPing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const currentPair = await accountabilityRepository.getMyPair(userId);
      setPair(currentPair);
      setPings(currentPair && currentPair.status === 'active' ? await accountabilityRepository.getPings(currentPair.id) : []);
      setError(null);
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('accountability.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    // جلب أولي عند التركيب (يستدعي setIsLoading داخل load) — نمط قياسي
    // ومختبَر في هذا المشروع، وليس اشتقاق حالة من props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  /** يلفّ كل فعل (طلب/قبول/رفض/إنهاء/تفاعل) بنفس معالجة الخطأ وحالة "جارِ التنفيذ". */
  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setIsActing(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, fallbackMessage));
    } finally {
      setIsActing(false);
    }
  }

  function sendRequest(partnerId: string) {
    if (!userId) return Promise.resolve();
    return runAction(() => accountabilityRepository.sendRequest(userId, partnerId), t('accountability.requestError'));
  }

  function respond(accept: boolean) {
    if (!pair) return Promise.resolve();
    return runAction(() => accountabilityRepository.respond(pair.id, accept), t('accountability.respondError'));
  }

  function endPair() {
    if (!pair) return Promise.resolve();
    return runAction(() => accountabilityRepository.endPair(pair.id), t('accountability.endError'));
  }

  function sendPing(kind: PingKind) {
    if (!pair || !userId) return Promise.resolve();
    return runAction(() => accountabilityRepository.sendPing(pair.id, userId, kind), t('accountability.pingError'));
  }

  const otherUserId = pair && userId ? (pair.requester_id === userId ? pair.partner_id : pair.requester_id) : null;
  const isIncomingRequest = pair?.status === 'pending' && pair.partner_id === userId;
  const isOutgoingRequest = pair?.status === 'pending' && pair.requester_id === userId;

  return {
    pair,
    pings,
    otherUserId,
    isIncomingRequest,
    isOutgoingRequest,
    isLoading,
    isActing,
    error,
    sendRequest,
    respond,
    endPair,
    sendPing,
    refetch: load,
  };
}
