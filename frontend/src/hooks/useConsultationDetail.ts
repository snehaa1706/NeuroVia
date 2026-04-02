import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { ConsultDetail } from '../types';

export function useConsultationDetail(consultId: string | undefined) {
    const [consultation, setConsultation] = useState<ConsultDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!consultId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getConsultDetail(consultId);
            setConsultation(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load consultation');
            setConsultation(null);
        } finally {
            setLoading(false);
        }
    }, [consultId]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const acceptConsult = async () => {
        if (!consultId) return;
        setActionLoading(true);
        try {
            await api.updateConsultStatus(consultId, 'accepted');
            await fetchDetail();
        } catch (err: any) {
            setError(err.message || 'Failed to accept consultation');
        } finally {
            setActionLoading(false);
        }
    };

    const cancelConsult = async () => {
        if (!consultId) return;
        setActionLoading(true);
        try {
            await api.updateConsultStatus(consultId, 'cancelled');
            await fetchDetail();
        } catch (err: any) {
            setError(err.message || 'Failed to cancel consultation');
        } finally {
            setActionLoading(false);
        }
    };

    const submitResponse = async (data: {
        diagnosis: string;
        notes?: string;
        prescription?: any[];
        follow_up_date?: string;
    }) => {
        if (!consultId) return;
        setActionLoading(true);
        try {
            await api.submitConsultResponse(consultId, data);
            await fetchDetail();
        } catch (err: any) {
            setError(err.message || 'Failed to submit response');
            throw err;
        } finally {
            setActionLoading(false);
        }
    };

    return {
        consultation,
        loading,
        error,
        actionLoading,
        refetch: fetchDetail,
        acceptConsult,
        cancelConsult,
        submitResponse,
    };
}
