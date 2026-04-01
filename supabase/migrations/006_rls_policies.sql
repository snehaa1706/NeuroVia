ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data via assessments

CREATE POLICY "Users can access their own responses"
ON assessment_responses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assessments
    WHERE assessments.id = assessment_responses.assessment_id
    AND assessments.user_id = auth.uid()
  )
);

CREATE POLICY "Users can access their own recommendations"
ON recommendations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assessments
    WHERE assessments.id = recommendations.assessment_id
    AND assessments.user_id = auth.uid()
  )
);
