import type { DatasetMetadata } from "../types";

export const getDatasetQualityScore = (metadata: DatasetMetadata): number => {
  const verified = metadata.verified === true || metadata.status === "verified";
  const hasIpfs = Boolean(String(metadata.ipfsHash ?? "").trim());
  const frozen = metadata.metadataFrozen === true;
  const isPublic = metadata.isPublic === true;

  return (verified ? 45 : 0) + (hasIpfs ? 30 : 0) + (frozen ? 15 : 0) + (isPublic ? 10 : 0);
};

export interface DatasetQualityComponent {
  /** Human-readable label for the scoring component. */
  label: string;
  /** Points this component contributes when earned. */
  points: number;
  /** Whether the dataset earned this component's points. */
  earned: boolean;
}

export interface DatasetQualityBreakdown {
  /** Total earned score (sum of earned component points). */
  score: number;
  /** Maximum achievable score. Always 100. */
  maxScore: number;
  /** Per-component detail, in descending point weight. */
  components: DatasetQualityComponent[];
}

/**
 * Explain a dataset's quality score component-by-component — the same signals
 * `getDatasetQualityScore` sums, but itemized so callers can show *why* a score
 * is what it is (e.g. "Add an IPFS hash for +30") or render a checklist.
 *
 * Components, in descending weight: verified on-chain (45), IPFS hash linked
 * (30), metadata frozen (15), publicly listed (10).
 *
 * @example
 * const { score, components } = getDatasetQualityBreakdown(dataset);
 * const missing = components.filter((c) => !c.earned);
 * // missing → suggestions to raise the score
 */
export const getDatasetQualityBreakdown = (
  metadata: DatasetMetadata,
): DatasetQualityBreakdown => {
  const components: DatasetQualityComponent[] = [
    {
      label: "Verified on-chain",
      points: 45,
      earned: metadata.verified === true || metadata.status === "verified",
    },
    {
      label: "IPFS hash linked",
      points: 30,
      earned: Boolean(String(metadata.ipfsHash ?? "").trim()),
    },
    {
      label: "Metadata frozen",
      points: 15,
      earned: metadata.metadataFrozen === true,
    },
    {
      label: "Publicly listed",
      points: 10,
      earned: metadata.isPublic === true,
    },
  ];

  const score = components.reduce((sum, c) => sum + (c.earned ? c.points : 0), 0);
  const maxScore = components.reduce((sum, c) => sum + c.points, 0);
  return { score, maxScore, components };
};

/** Letter grade derived from a 0–100 quality score, A (best) through F (worst). */
export type DatasetQualityGrade = "A" | "B" | "C" | "D" | "F";

export interface DatasetQualityRating {
  /** The underlying 0–100 score from `getDatasetQualityScore`. */
  score: number;
  grade: DatasetQualityGrade;
  /** Human-friendly summary of the grade, e.g. "Excellent". */
  label: string;
}

const GRADE_LABELS: Record<DatasetQualityGrade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Minimal",
};

/**
 * Map a 0–100 quality score to a letter grade. Out-of-range scores are clamped:
 * values below 0 grade as `F`, values above 100 grade as `A`.
 *
 * Thresholds: A ≥ 90, B ≥ 75, C ≥ 50, D ≥ 25, otherwise F.
 */
export const qualityScoreToGrade = (score: number): DatasetQualityGrade => {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 50) return "C";
  if (score >= 25) return "D";
  return "F";
};

/**
 * Grade a dataset's quality, combining `getDatasetQualityScore` with a letter
 * grade and label for at-a-glance display (e.g. a badge on a dataset card).
 *
 * @example
 * const { grade, label } = getDatasetQualityGrade(dataset);
 * // grade: "B", label: "Good"
 */
export const getDatasetQualityGrade = (
  metadata: DatasetMetadata,
): DatasetQualityRating => {
  const score = getDatasetQualityScore(metadata);
  const grade = qualityScoreToGrade(score);
  return { score, grade, label: GRADE_LABELS[grade] };
};

export interface DatasetQualityStats {
  /** Number of datasets the stats were computed over. */
  count: number;
  /** Mean quality score across all datasets. */
  average: number;
  /** Median quality score across all datasets. */
  median: number;
  /** Lowest quality score in the set. */
  min: number;
  /** Highest quality score in the set. */
  max: number;
}

/**
 * Aggregate `getDatasetQualityScore` across a set of datasets — the quality
 * equivalent of `getAltitudeRange`/`getDatasetsCentroid`, useful for
 * dashboards, owner leaderboards, or collection-health summaries.
 *
 * Returns `null` for an empty array.
 *
 * @example
 * const stats = getDatasetsQualityStats(ownerDatasets);
 * if (stats) console.log(`avg ${stats.average}, median ${stats.median}`);
 */
export const getDatasetsQualityStats = (
  datasets: DatasetMetadata[],
): DatasetQualityStats | null => {
  if (datasets.length === 0) return null;

  const scores = datasets
    .map((metadata) => getDatasetQualityScore(metadata))
    .sort((a, b) => a - b);

  const count = scores.length;
  const sum = scores.reduce((total, score) => total + score, 0);
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];

  return {
    count,
    average: sum / count,
    median,
    min: scores[0],
    max: scores[count - 1],
  };
};

