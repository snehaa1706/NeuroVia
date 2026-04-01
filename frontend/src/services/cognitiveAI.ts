import api from '../api/apiClient';

export const getDifficultyRecommendation = async (): Promise<'easy' | 'medium' | 'hard'> => {
  try {
    const response = await api.get('/cognitive/summary');
    const summary = response.data;

    if (!summary || summary.latest_score === null) {
      return 'easy';
    }

    if (summary.latest_score > 80) {
      return 'hard';
    }

    if (summary.latest_score > 50) {
      return 'medium';
    }

    return 'easy';
  } catch (error) {
    console.warn('Failed to get difficulty recommendation, falling back to easy', error);
    return 'easy';
  }
};
