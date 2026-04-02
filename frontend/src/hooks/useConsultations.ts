import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { ConsultRequest, PaginatedConsultList } from '../types';

export function useConsultations() {
    const [consultations, setConsultations] = useState<ConsultRequest[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    const fetchConsultations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data: PaginatedConsultList = await api.getConsultRequests(statusFilter, page, pageSize);
            setConsultations(data.items || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 0);
        } catch (err: any) {
            setError(err.message || 'Failed to load consultations');
            setConsultations([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page, pageSize]);

    useEffect(() => {
        fetchConsultations();
    }, [fetchConsultations]);

    return {
        consultations,
        total,
        totalPages,
        loading,
        error,
        page,
        statusFilter,
        setStatusFilter,
        setPage,
        refetch: fetchConsultations,
    };
}
