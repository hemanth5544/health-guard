/// Utility functions for compliance scoring and risk assessment.

export function complianceScore(passed: number, applied: number) {
  if (applied <= 0) return 0;
  return Math.round((passed / applied) * 100);
}

export function bayesianRiskScore(params: {
  threatWeights: Array<{ weight: number; mitigationEffectiveness: number }>;
  priorRisk: number;
  likelihood: number;
  evidence: number;
}) {
  const bayesianFactor =
    (params.priorRisk * params.likelihood) / Math.max(params.evidence, 0.0001);
  const sum = params.threatWeights.reduce(
    (acc, t) => acc + t.weight * (1 - t.mitigationEffectiveness),
    0
  );
  return Math.max(0, Math.round(sum * bayesianFactor));
}
